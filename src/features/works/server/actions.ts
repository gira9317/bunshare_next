'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * いいねの追加/削除
 */
export async function toggleLikeAction(workId: string) {
  const supabase = await createClient()
  
  // ユーザー認証確認
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 既存のいいねを確認
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('work_id', workId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      // いいねを削除
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('work_id', workId)
        .eq('user_id', user.id)

      if (error) throw error

      // キャッシュを無効化
      revalidateTag(`work:${workId}`)
      revalidateTag(`user:${user.id}:likes`)

      return { success: true, liked: false }
    } else {
      // いいねを追加
      const { error } = await supabase
        .from('likes')
        .insert({
          work_id: workId,
          user_id: user.id
        })

      if (error) throw error

      // キャッシュを無効化
      revalidateTag(`work:${workId}`)
      revalidateTag(`user:${user.id}:likes`)

      return { success: true, liked: true }
    }
  } catch (error) {
    console.error('いいねエラー:', error)
    return { error: 'いいねの処理に失敗しました' }
  }
}

/**
 * ブックマークの追加/削除
 */
export async function toggleBookmarkAction(workId: string) {
  const supabase = await createClient()
  
  // ユーザー認証確認
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 既存のブックマークを確認
    const { data: existingBookmark } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('work_id', workId)
      .eq('user_id', user.id)
      .single()

    if (existingBookmark) {
      // ブックマークを削除
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('work_id', workId)
        .eq('user_id', user.id)

      if (error) throw error

      // キャッシュを無効化
      revalidateTag(`work:${workId}`)
      revalidateTag(`user:${user.id}:bookmarks`)

      return { success: true, bookmarked: false }
    } else {
      // ブックマークを追加
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          work_id: workId,
          user_id: user.id,
          folder: 'default' // デフォルトフォルダに追加
        })

      if (error) throw error

      // キャッシュを無効化
      revalidateTag(`work:${workId}`)
      revalidateTag(`user:${user.id}:bookmarks`)

      return { success: true, bookmarked: true }
    }
  } catch (error) {
    console.error('ブックマークエラー:', error)
    return { error: 'ブックマークの処理に失敗しました' }
  }
}

/**
 * ブックマークフォルダ一覧を取得（システムフォルダ+ユーザーフォルダ）
 */
export async function getBookmarkFoldersAction() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // システムフォルダとユーザーのカスタムフォルダを取得
    const { data: folders, error } = await supabase
      .from('bookmark_folders')
      .select('id, folder_key, folder_name, is_private, is_system, sort_order')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .order('is_system', { ascending: false }) // システムフォルダを先に
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    // システムフォルダが存在しない場合は作成
    let folderList = folders || []
    if (!folderList.some(f => f.is_system)) {
      await ensureSystemFolders()
      // 再取得
      const { data: refetchedFolders } = await supabase
        .from('bookmark_folders')
        .select('id, folder_key, folder_name, is_private, is_system, sort_order')
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order('is_system', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      folderList = refetchedFolders || []
    }

    // 各フォルダの作品数を取得
    const foldersWithCount = await Promise.all(
      folderList.map(async (folder) => {
        const { count } = await supabase
          .from('bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('folder', folder.folder_key)

        // 最新の作品情報を1件取得（サムネイル用）
        const { data: latestBookmark } = await supabase
          .from('bookmarks')
          .select('work_id, bookmarked_at')
          .eq('user_id', user.id)
          .eq('folder', folder.folder_key)
          .order('bookmarked_at', { ascending: false })
          .limit(1)
          .single()

        let thumbnail_url = null
        if (latestBookmark) {
          const { data: work } = await supabase
            .from('works')
            .select('image_url')
            .eq('work_id', latestBookmark.work_id)
            .single()
          thumbnail_url = work?.image_url
        }

        return {
          ...folder,
          work_count: count || 0,
          thumbnail_url,
          last_updated: latestBookmark?.bookmarked_at
        }
      })
    )

    return { success: true, folders: foldersWithCount }
  } catch (error) {
    console.error('ブックマークフォルダ取得エラー:', error)
    return { error: 'フォルダの取得に失敗しました' }
  }
}

/**
 * システムフォルダの存在を確認し、なければ作成
 */
async function ensureSystemFolders() {
  const supabase = await createClient()
  
  const systemFolders = [
    { folder_key: 'default', folder_name: 'デフォルト', sort_order: 1 },
    { folder_key: 'favorites', folder_name: 'お気に入り', sort_order: 2 },
    { folder_key: 'toread', folder_name: '後で読む', sort_order: 3 }
  ]

  try {
    for (const folder of systemFolders) {
      await supabase
        .from('bookmark_folders')
        .upsert({
          user_id: null, // システムフォルダはuser_idがNULL
          folder_key: folder.folder_key,
          folder_name: folder.folder_name,
          sort_order: folder.sort_order,
          is_system: true,
          is_private: false
        }, { 
          onConflict: 'user_id,folder_key',
          ignoreDuplicates: true 
        })
    }
  } catch (error) {
    console.error('システムフォルダ作成エラー:', error)
  }
}

/**
 * 新しいブックマークフォルダを作成
 */
export async function createBookmarkFolderAction(folderName: string, isPrivate: boolean = false) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const folderKey = `folder_${Date.now()}`
    
    const { data: folder, error } = await supabase
      .from('bookmark_folders')
      .insert({
        user_id: user.id,
        folder_key: folderKey,
        folder_name: folderName,
        is_private: isPrivate,
        is_system: false
      })
      .select('id, folder_key, folder_name, is_private, is_system')
      .single()

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:bookmark_folders`)

    return { success: true, folder }
  } catch (error) {
    console.error('ブックマークフォルダ作成エラー:', error)
    return { error: 'フォルダの作成に失敗しました' }
  }
}

/**
 * ブックマークをフォルダに保存
 */
export async function saveBookmarkToFoldersAction(workId: string, folderKeys: string[], memo: string = '') {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 既存のブックマークを削除
    await supabase
      .from('bookmarks')
      .delete()
      .eq('work_id', workId)
      .eq('user_id', user.id)

    if (folderKeys.length > 0) {
      // 複数フォルダの場合は複数レコードとして保存
      const bookmarks = folderKeys.map(folderKey => ({
        user_id: user.id,
        work_id: workId,
        folder: folderKey, // 単一フォルダとして保存
        memo: memo || null
      }))

      const { error: insertError } = await supabase
        .from('bookmarks')
        .insert(bookmarks)

      if (insertError) throw insertError
    }

    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag(`user:${user.id}:bookmarks`)

    return { success: true, bookmarked: folderKeys.length > 0 }
  } catch (error) {
    console.error('ブックマーク保存エラー:', error)
    return { error: 'ブックマークの保存に失敗しました' }
  }
}

/**
 * 作品の現在のブックマークフォルダとメモを取得
 */
export async function getWorkBookmarkFoldersAction(workId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { data: bookmarks, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('work_id', workId)
      .eq('user_id', user.id)

    if (error) throw error

    if (bookmarks && bookmarks.length > 0) {
      // 複数レコード対応 - 各レコードのfolderを配列として集める
      const folderKeys = bookmarks.map(b => b.folder).filter(Boolean)
      const currentMemo = bookmarks[0]?.memo || '' // 最初のレコードからメモを取得
      
      return { success: true, folderKeys, memo: currentMemo }
    }

    return { success: true, folderKeys: [], memo: '' }
  } catch (error) {
    console.error('ブックマークフォルダ取得エラー:', error)
    return { error: 'ブックマークフォルダの取得に失敗しました' }
  }
}

/**
 * ブックマークフォルダのプライベート設定を切り替え
 */
export async function toggleFolderPrivateAction(folderId: string, isPrivate: boolean) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // システムフォルダの場合はエラー
    const { data: folder, error: fetchError } = await supabase
      .from('bookmark_folders')
      .select('is_system, user_id')
      .eq('id', folderId)
      .single()

    if (fetchError) throw fetchError
    
    if (folder.is_system || folder.user_id !== user.id) {
      return { error: 'システムフォルダまたは他のユーザーのフォルダは変更できません' }
    }

    // プライベート設定を更新
    const { error: updateError } = await supabase
      .from('bookmark_folders')
      .update({ is_private: isPrivate })
      .eq('id', folderId)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:bookmark_folders`)

    return { success: true, isPrivate }
  } catch (error) {
    console.error('フォルダプライベート設定エラー:', error)
    return { error: 'プライベート設定の変更に失敗しました' }
  }
}

/**
 * ブックマークフォルダ名を更新
 */
export async function updateBookmarkFolderAction(folderId: string, folderName: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // システムフォルダの場合はエラー
    const { data: folder, error: fetchError } = await supabase
      .from('bookmark_folders')
      .select('is_system, user_id')
      .eq('id', folderId)
      .single()

    if (fetchError) throw fetchError
    
    if (folder.is_system || folder.user_id !== user.id) {
      return { error: 'システムフォルダまたは他のユーザーのフォルダは変更できません' }
    }

    // フォルダ名を更新
    const { error: updateError } = await supabase
      .from('bookmark_folders')
      .update({ 
        folder_name: folderName,
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:bookmark_folders`)

    return { success: true }
  } catch (error) {
    console.error('フォルダ名更新エラー:', error)
    return { error: 'フォルダ名の更新に失敗しました' }
  }
}

/**
 * ブックマークフォルダを削除
 */
export async function deleteBookmarkFolderAction(folderId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // システムフォルダの場合はエラー
    const { data: folder, error: fetchError } = await supabase
      .from('bookmark_folders')
      .select('is_system, user_id, folder_key')
      .eq('id', folderId)
      .single()

    if (fetchError) throw fetchError
    
    if (folder.is_system || folder.user_id !== user.id) {
      return { error: 'システムフォルダまたは他のユーザーのフォルダは削除できません' }
    }

    // フォルダ内のブックマークを削除
    await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('folder', folder.folder_key)

    // フォルダを削除
    const { error: deleteError } = await supabase
      .from('bookmark_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', user.id)

    if (deleteError) throw deleteError

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:bookmark_folders`)
    revalidateTag(`user:${user.id}:bookmarks`)

    return { success: true }
  } catch (error) {
    console.error('フォルダ削除エラー:', error)
    return { error: 'フォルダの削除に失敗しました' }
  }
}

/**
 * フォルダ別のブックマーク作品を取得
 */
export async function getBookmarksByFolderAction(folderKey: string = 'all') {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // まず、ブックマークテーブルからwork_idを取得
    let bookmarkQuery = supabase
      .from('bookmarks')
      .select('work_id, folder, memo, bookmarked_at, sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('bookmarked_at', { ascending: false })

    // フォルダ指定の場合
    if (folderKey && folderKey !== 'all') {
      bookmarkQuery = bookmarkQuery.eq('folder', folderKey)
    }

    const { data: bookmarks, error: bookmarksError } = await bookmarkQuery

    if (bookmarksError) throw bookmarksError

    if (!bookmarks?.length) {
      return { success: true, works: [], count: 0 }
    }

    // work_idの配列を取得
    const workIds = bookmarks.map(bookmark => bookmark.work_id)

    // 作品情報を別途取得
    const { data: works, error: worksError } = await supabase
      .from('works')
      .select(`
        work_id,
        title,
        description,
        image_url,
        category,
        tags,
        created_at,
        updated_at,
        user_id,
        series_id,
        is_published,
        views,
        likes,
        episode_number
      `)
      .in('work_id', workIds)
      .eq('is_published', true)

    if (worksError) throw worksError

    // 作者情報を取得
    const userIds = [...new Set(works?.map(work => work.user_id).filter(Boolean))] || []
    let userMap: { [key: string]: any } = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds)
      
      if (!usersError && users) {
        userMap = users.reduce((acc, user) => {
          acc[user.id] = user
          return acc
        }, {} as { [key: string]: any })
      }
    }

    // 作品データに作者情報を追加
    const worksWithAuthor = works?.map(work => ({
      ...work,
      author: userMap[work.user_id]?.username || '不明',
      author_username: userMap[work.user_id]?.username
    })) || []

    return { success: true, works: worksWithAuthor, count: worksWithAuthor.length }
  } catch (error) {
    console.error('フォルダ別ブックマーク取得エラー:', error)
    return { error: 'ブックマークの取得に失敗しました' }
  }
}

/**
 * シェア用URLを生成
 */
export async function getShareUrlAction(workId: string) {
  const supabase = await createClient()
  
  try {
    // 作品情報を取得
    const { data: work, error } = await supabase
      .from('works')
      .select('title, author, description')
      .eq('work_id', workId)
      .single()

    if (error) throw error

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bunshare.com'
    const shareUrl = `${baseUrl}/works/${workId}`
    
    return {
      success: true,
      url: shareUrl,
      title: work.title,
      text: `${work.title} by ${work.author} - ${work.description?.slice(0, 100)}...`
    }
  } catch (error) {
    console.error('シェアURL生成エラー:', error)
    return { error: 'シェア情報の取得に失敗しました' }
  }
}

/**
 * ブックマークの順序を更新
 */
export async function updateBookmarkOrderAction(workId: string, folderKey: string, newOrder: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { error } = await supabase
      .from('bookmarks')
      .update({ sort_order: newOrder })
      .eq('user_id', user.id)
      .eq('work_id', workId)
      .eq('folder', folderKey)

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:bookmarks:${folderKey}`)

    return { success: true }
  } catch (error) {
    console.error('ブックマーク順序更新エラー:', error)
    return { error: 'ブックマークの順序更新に失敗しました' }
  }
}

/**
 * ブックマークをフォルダから削除
 */
export async function removeBookmarkFromFolderAction(workId: string, folderKey: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('work_id', workId)
      .eq('folder', folderKey)

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:bookmarks:${folderKey}`)
    revalidateTag(`user:${user.id}:bookmark_folders`)

    return { success: true }
  } catch (error) {
    console.error('ブックマーク削除エラー:', error)
    return { error: 'ブックマークの削除に失敗しました' }
  }
}

/**
 * ブックマークを他のフォルダに移動
 */
export async function moveBookmarkToFolderAction(workId: string, fromFolder: string, toFolder: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 移動先フォルダの最大sort_orderを取得
    const { data: maxOrderData } = await supabase
      .from('bookmarks')
      .select('sort_order')
      .eq('user_id', user.id)
      .eq('folder', toFolder)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = (maxOrderData?.[0]?.sort_order || 0) + 1

    // ブックマークを更新（フォルダとsort_orderを変更）
    const { error } = await supabase
      .from('bookmarks')
      .update({ 
        folder: toFolder,
        sort_order: nextOrder,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('work_id', workId)
      .eq('folder', fromFolder)

    if (error) throw error

    // 両方のフォルダのキャッシュを無効化
    revalidateTag(`user:${user.id}:bookmarks:${fromFolder}`)
    revalidateTag(`user:${user.id}:bookmarks:${toFolder}`)
    revalidateTag(`user:${user.id}:bookmark_folders`)

    return { success: true }
  } catch (error) {
    console.error('ブックマーク移動エラー:', error)
    return { error: 'ブックマークの移動に失敗しました' }
  }
}

/**
 * ブックマークのメモを更新
 */
export async function updateBookmarkMemoAction(workId: string, folderKey: string, memo: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { error } = await supabase
      .from('bookmarks')
      .update({ 
        memo: memo,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('work_id', workId)
      .eq('folder', folderKey)

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:bookmarks:${folderKey}`)

    return { success: true }
  } catch (error) {
    console.error('ブックマークメモ更新エラー:', error)
    return { error: 'メモの更新に失敗しました' }
  }
}

/**
 * 読書進捗を更新
 */
export async function updateReadingProgressAction(workId: string, progress: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // reading_progressテーブルに保存
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        work_id: workId,
        progress: progress,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,work_id'
      })

    if (error) throw error

    // reading_bookmarksにも保存（続きを読む機能用）
    if (progress > 0) {
      await supabase
        .from('reading_bookmarks')
        .upsert({
          user_id: user.id,
          work_id: workId,
          last_position: progress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,work_id'
        })
    }

    return { success: true }
  } catch (error) {
    console.error('読書進捗更新エラー:', error)
    return { error: '読書進捗の保存に失敗しました' }
  }
}

/**
 * 作品を作成
 */
export async function createWorkAction(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // FormDataから値を取得
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const content = formData.get('content') as string
    const category = formData.get('category') as string
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : []
    const image_url = formData.get('image_url') as string
    const series_id = formData.get('series_id') as string
    const episode_number = formData.get('episode_number') ? parseInt(formData.get('episode_number') as string) : null
    const is_adult_content = formData.get('is_adult_content') === 'true'
    const allow_comments = formData.get('allow_comments') !== 'false'
    const publish_timing = formData.get('publish_timing') as string
    const scheduled_at = formData.get('scheduled_at') as string

    // バリデーション
    if (!title || !content || !category) {
      return { error: 'タイトル、本文、カテゴリは必須です' }
    }

    // 作品IDを生成
    const work_id = crypto.randomUUID()

    // 作品データを作成
    const workData = {
      work_id,
      user_id: user.id,
      title,
      description: description || null,
      content,
      category,
      tags: tags.length > 0 ? tags : null,
      image_url: image_url || null,
      series_id: series_id || null,
      episode_number: episode_number,
      is_adult_content,
      allow_comments,
      is_published: publish_timing === 'now',
      scheduled_at: publish_timing === 'scheduled' ? scheduled_at : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0,
      likes: 0,
      comments: 0
    }

    // 作品を挿入
    const { error } = await supabase
      .from('works')
      .insert(workData)

    if (error) throw error

    // キャッシュを無効化
    revalidateTag('works')
    revalidateTag(`user:${user.id}:works`)

    return { success: true, workId: work_id }
  } catch (error) {
    console.error('作品作成エラー:', error)
    return { error: '作品の作成に失敗しました' }
  }
}

/**
 * シリーズを作成
 */
export async function createSeriesAction(title: string, description?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const series_id = crypto.randomUUID()

    const { error } = await supabase
      .from('series')
      .insert({
        series_id,
        user_id: user.id,
        title,
        description: description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:series`)

    return { success: true, seriesId: series_id }
  } catch (error) {
    console.error('シリーズ作成エラー:', error)
    return { error: 'シリーズの作成に失敗しました' }
  }
}

/**
 * テスト用作品を作成（開発用）
 */
export async function createTestWorkAction() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const work_id = crypto.randomUUID()

    const testWork = {
      work_id,
      user_id: user.id,
      title: '【テスト】星降る夜の物語',
      description: '静寂な夜空に降る星たちが奏でる、美しくも切ない物語。',
      content: `第一章 星降る夜

夜空には無数の星が瞬いていた。まるで天の神々が地上の人々に向けて投げかけた祝福のようだった。

「また星を見てるの？」

背後から聞こえた声に振り返ると、幼なじみの美月が立っていた。彼女の瞳には、僕が見上げている星空と同じ光が宿っているように見えた。

「星って、本当はすごく遠くにあるのに、こんなに近くに感じるよね」

僕はそう呟きながら、再び夜空を見上げた。美月も隣に座り、同じように星を見上げる。

二人の間に流れる時間は、まるで永遠のようだった。`,
      category: '小説',
      tags: ['ファンタジー', '青春', '恋愛'],
      is_published: true,
      allow_comments: true,
      is_adult_content: false,
      views: 0,
      likes: 0,
      comments: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('works')
      .insert(testWork)

    if (error) throw error

    console.log('テスト作品作成完了:', { work_id, title: testWork.title })

    return { success: true, workId: work_id, title: testWork.title }
  } catch (error) {
    console.error('テスト作品作成エラー:', error)
    return { error: 'テスト作品の作成に失敗しました' }
  }
}