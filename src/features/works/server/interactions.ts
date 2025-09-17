'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getJSTAsUTC } from '@/lib/utils/timezone'

/**
 * いいねの追加/削除
 */
export async function toggleLikeAction(workId: string) {
  const supabase = await createClient()
  
  // ユーザー認証確認
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('Auth error:', authError)
    return { error: '認証エラーが発生しました' }
  }
  
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 既存のいいねを確認
    const { data: existingLike, error: selectError } = await supabase
      .from('likes')
      .select('id')
      .eq('work_id', workId)
      .eq('user_id', user.id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Select error:', {
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint,
        code: selectError.code
      })
      throw selectError
    }

    if (existingLike) {
      // いいねを削除
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('work_id', workId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Delete error:', {
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          code: deleteError.code
        })
        throw deleteError
      }

      // キャッシュを無効化
      revalidateTag(`work:${workId}`)
      revalidateTag(`user:${user.id}:likes`)

      return { success: true, liked: false }
    } else {
      // いいねを追加
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          work_id: workId,
          user_id: user.id
        })

      if (insertError) {
        console.error('Insert error:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        })
        throw insertError
      }

      // キャッシュを無効化
      revalidateTag(`work:${workId}`)
      revalidateTag(`user:${user.id}:likes`)

      return { success: true, liked: true }
    }
  } catch (error) {
    console.error('いいねエラー詳細:', error)
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

        // ソート順の上位3件を取得（スタック表示用）
        const { data: latestBookmarks } = await supabase
          .from('bookmarks')
          .select('work_id, bookmarked_at, sort_order')
          .eq('user_id', user.id)
          .eq('folder', folder.folder_key)
          .order('sort_order', { ascending: true })
          .order('bookmarked_at', { ascending: false })  // sort_orderが同じ場合のfallback
          .limit(3)

        let thumbnail_url = null
        let work_thumbnails: string[] = []
        
        if (latestBookmarks && latestBookmarks.length > 0) {
          // 各作品の画像URLを取得
          const workIds = latestBookmarks.map(bookmark => bookmark.work_id)
          const { data: works } = await supabase
            .from('works')
            .select('work_id, image_url')
            .in('work_id', workIds)

          if (works) {
            // ブックマーク順序を保持して画像URLを取得
            work_thumbnails = latestBookmarks
              .map(bookmark => {
                const work = works.find(w => w.work_id === bookmark.work_id)
                return work?.image_url
              })
              .filter(Boolean) as string[]
            
            // 最新の作品画像をメインサムネイルとして設定
            thumbnail_url = work_thumbnails[0] || null
          }
        }

        return {
          ...folder,
          work_count: count || 0,
          thumbnail_url,
          work_thumbnails,
          last_updated: latestBookmarks?.[0]?.bookmarked_at
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
        updated_at: getJSTAsUTC()
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

    // 作品データに作者情報を追加し、ブックマーク順序を保持
    const bookmarkMap = bookmarks.reduce((acc, bookmark) => {
      acc[bookmark.work_id] = bookmark
      return acc
    }, {} as { [key: string]: any })

    const worksWithAuthor = works?.map(work => ({
      ...work,
      author: userMap[work.user_id]?.username || '不明',
      author_username: userMap[work.user_id]?.username,
      bookmark_sort_order: bookmarkMap[work.work_id]?.sort_order || 0,
      bookmarked_at: bookmarkMap[work.work_id]?.bookmarked_at,
      memo: bookmarkMap[work.work_id]?.memo
    })) || []

    // sort_orderで並び替え（nullやundefinedは最後に）
    const sortedWorks = worksWithAuthor.sort((a, b) => {
      const aSort = a.bookmark_sort_order ?? 999999
      const bSort = b.bookmark_sort_order ?? 999999
      if (aSort !== bSort) {
        return aSort - bSort
      }
      // sort_orderが同じ場合はbookmarked_atの新しい順
      return new Date(b.bookmarked_at || 0).getTime() - new Date(a.bookmarked_at || 0).getTime()
    })

    return { success: true, works: sortedWorks, count: sortedWorks.length }
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
 * ブックマークの順序を更新（全てのアイテムの順序を再設定）
 */
export async function updateBookmarkOrderAction(folderKey: string, workOrders: { work_id: string; sort_order: number }[]) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 全てのアイテムの順序を更新
    for (const workOrder of workOrders) {
      const { error } = await supabase
        .from('bookmarks')
        .update({ sort_order: workOrder.sort_order })
        .eq('user_id', user.id)
        .eq('work_id', workOrder.work_id)
        .eq('folder', folderKey)

      if (error) throw error
    }

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
        updated_at: getJSTAsUTC()
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
        updated_at: getJSTAsUTC()
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
 * シリーズの作品一覧を取得
 */
export async function getSeriesWorksAction(seriesId: string) {
  const supabase = await createClient()
  
  try {
    // シリーズに属する作品を取得
    const { data, error } = await supabase
      .from('works')
      .select(`
        work_id,
        user_id,
        title,
        description,
        content,
        category,
        tags,
        image_url,
        series_id,
        episode_number,
        is_adult_content,
        created_at,
        updated_at,
        views,
        likes,
        comments,
        rating
      `)
      .eq('series_id', seriesId)
      .eq('is_published', true)
      .order('episode_number', { ascending: true })

    if (error) {
      console.error('Error fetching series works:', error)
      return { error: 'シリーズ作品の取得に失敗しました' }
    }

    // 作者情報を取得
    const userIds = [...new Set(data?.map(work => work.user_id).filter(Boolean))] || []
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

    const works = (data || []).map(work => ({
      ...work,
      author: userMap[work.user_id]?.username || '不明',
      author_username: userMap[work.user_id]?.username
    }))

    return { success: true, works }
  } catch (error) {
    console.error('シリーズ作品取得エラー:', error)
    return { error: 'シリーズ作品の取得に失敗しました' }
  }
}

/**
 * シリーズから作品を削除
 */
export async function removeWorkFromSeriesAction(workId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { error } = await supabase
      .from('works')
      .update({ 
        series_id: null,
        episode_number: null,
        updated_at: getJSTAsUTC()
      })
      .eq('work_id', workId)
      .eq('user_id', user.id)

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag(`user:${user.id}:series`)

    return { success: true }
  } catch (error) {
    console.error('シリーズからの作品削除エラー:', error)
    return { error: '作品の削除に失敗しました' }
  }
}

/**
 * コメントを取得
 */
export async function getCommentsAction(workId: string, limit: number = 10, offset: number = 0) {
  const supabase = await createClient()
  
  try {
    // 本来のクエリ
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        review_id,
        work_id,
        user_id,
        comment,
        created_at,
        updated_at
      `)
      .eq('work_id', workId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Supabase error details:', error)
      throw error
    }

    // ユーザー情報を別途取得
    const userIds = data?.map(r => r.user_id).filter(Boolean) || []
    const uniqueUserIds = [...new Set(userIds)]
    let userMap: { [key: string]: any } = {}
    
    if (uniqueUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', uniqueUserIds)
      
      if (users && users.length > 0) {
        users.forEach(user => {
          userMap[user.id] = {
            id: user.id,
            username: user.username,
            avatar_url: user.avatar_img_url
          }
        })
      }
    }

    const comments = data?.map(review => ({
      review_id: review.review_id,
      work_id: review.work_id,
      user_id: review.user_id,
      comment: review.comment,
      created_at: review.created_at,
      updated_at: review.updated_at,
      user: review.user_id ? userMap[review.user_id] || null : null
    })) || []

    // 総コメント数を取得
    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('work_id', workId)

    return { success: true, comments, total: count || 0 }
  } catch (error) {
    console.error('コメント取得エラー:', error)
    return { error: 'コメントの取得に失敗しました' }
  }
}

/**
 * コメントを追加
 */
export async function addCommentAction(workId: string, comment: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        work_id: workId,
        user_id: user.id,
        comment: comment.trim()
      })
      .select(`
        review_id,
        work_id,
        user_id,
        comment,
        created_at,
        updated_at
      `)
      .single()

    if (error) throw error

    // ユーザー情報を追加
    const { data: userData } = await supabase
      .from('users')
      .select('id, username, avatar_img_url')
      .eq('id', user.id)
      .single()

    const newComment = {
      ...data,
      user: userData ? {
        id: userData.id,
        username: userData.username,
        avatar_url: userData.avatar_img_url
      } : null
    }

    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag(`work:${workId}:comments`)

    return { success: true, comment: newComment }
  } catch (error) {
    console.error('コメント追加エラー:', error)
    return { error: 'コメントの投稿に失敗しました' }
  }
}

/**
 * コメントを編集
 */
export async function editCommentAction(reviewId: string, comment: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        comment: comment.trim(),
        updated_at: getJSTAsUTC()
      })
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .select(`
        review_id,
        work_id,
        user_id,
        comment,
        created_at,
        updated_at
      `)
      .single()

    if (error) throw error

    // ユーザー情報を追加
    const { data: userData } = await supabase
      .from('users')
      .select('id, username, avatar_img_url')
      .eq('id', user.id)
      .single()

    const updatedComment = {
      ...data,
      user: userData ? {
        id: userData.id,
        username: userData.username,
        avatar_url: userData.avatar_img_url
      } : null
    }

    // キャッシュを無効化
    revalidateTag(`work:${data.work_id}`)
    revalidateTag(`work:${data.work_id}:comments`)

    return { success: true, comment: updatedComment }
  } catch (error) {
    console.error('コメント編集エラー:', error)
    return { error: 'コメントの編集に失敗しました' }
  }
}

/**
 * コメントを削除
 */
export async function deleteCommentAction(reviewId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 削除前に作品IDを取得
    const { data: review } = await supabase
      .from('reviews')
      .select('work_id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .single()

    if (!review) {
      return { error: 'コメントが見つかりません' }
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', user.id)

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`work:${review.work_id}`)
    revalidateTag(`work:${review.work_id}:comments`)

    return { success: true }
  } catch (error) {
    console.error('コメント削除エラー:', error)
    return { error: 'コメントの削除に失敗しました' }
  }
}

/**
 * シリーズ内の作品の順序を更新
 */
export async function updateSeriesWorkOrderAction(works: { work_id: string; episode_number: number }[]) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // トランザクション内で各作品のエピソード番号を更新
    // まず一時的にNULLに設定してから新しい番号を設定（重複を避けるため）
    for (const work of works) {
      // 一時的にepisode_numberをNULLに設定
      const { error: nullifyError } = await supabase
        .from('works')
        .update({ 
          episode_number: null,
          updated_at: getJSTAsUTC()
        })
        .eq('work_id', work.work_id)
        .eq('user_id', user.id)

      if (nullifyError) throw nullifyError
    }

    // 新しいエピソード番号を設定
    for (const work of works) {
      const { error } = await supabase
        .from('works')
        .update({ 
          episode_number: work.episode_number,
          updated_at: getJSTAsUTC()
        })
        .eq('work_id', work.work_id)
        .eq('user_id', user.id)

      if (error) throw error
    }

    // キャッシュを無効化
    works.forEach(work => {
      revalidateTag(`work:${work.work_id}`)
    })
    revalidateTag(`user:${user.id}:series`)

    return { success: true }
  } catch (error) {
    console.error('作品順序更新エラー:', error)
    return { error: '作品順序の更新に失敗しました' }
  }
}

/**
 * しおりデータを取得
 */
export async function getReadingBookmarkAction(workId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { data, error } = await supabase
      .from('reading_bookmarks')
      .select('*')
      .eq('work_id', workId)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('しおり取得エラー:', error)
      return { error: 'しおりの取得に失敗しました' }
    }

    return { success: true, bookmark: data }
  } catch (error) {
    console.error('しおり取得例外:', error)
    return { error: 'しおりの取得に失敗しました' }
  }
}

/**
 * しおりを保存
 */
export async function saveReadingBookmarkAction(
  workId: string, 
  scrollPosition: number, 
  readingProgress: number,
  bookmarkText?: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { data, error } = await supabase
      .from('reading_bookmarks')
      .upsert({
        user_id: user.id,
        work_id: workId,
        scroll_position: scrollPosition,
        reading_progress: Math.min(readingProgress, 100),
        bookmark_text: bookmarkText || null,
        updated_at: getJSTAsUTC()
      }, {
        onConflict: 'user_id,work_id'
      })
      .select()
      .single()

    if (error) {
      console.error('しおり保存エラー:', error)
      return { error: 'しおりの保存に失敗しました' }
    }

    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag(`user:${user.id}:reading_bookmarks`)

    return { success: true, bookmark: data }
  } catch (error) {
    console.error('しおり保存例外:', error)
    return { error: 'しおりの保存に失敗しました' }
  }
}

/**
 * しおりを削除
 */
export async function deleteReadingBookmarkAction(workId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { error } = await supabase
      .from('reading_bookmarks')
      .delete()
      .eq('work_id', workId)
      .eq('user_id', user.id)

    if (error) {
      console.error('しおり削除エラー:', error)
      return { error: 'しおりの削除に失敗しました' }
    }

    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag(`user:${user.id}:reading_bookmarks`)

    return { success: true }
  } catch (error) {
    console.error('しおり削除例外:', error)
    return { error: 'しおりの削除に失敗しました' }
  }
}

/**
 * 閲覧数をインクリメント（30分スロット単位での重複防止）
 */
export async function incrementViewAction(workId: string) {
  const supabase = await createClient()
  
  try {
    // ユーザー情報を取得（ログイン不要）
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null
    
    // 現在時刻から30分スロットを計算
    const now = new Date()
    const thirtyMinSlot = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      Math.floor(now.getMinutes() / 30) * 30,
      0,
      0
    )
    
    // 今日の日付（YYYY-MM-DD形式）
    const viewedDate = now.toISOString().split('T')[0]
    
    // 30分スロット内での重複チェック
    const { data: existingView } = await supabase
      .from('views_log')
      .select('id')
      .eq('work_id', workId)
      .eq('user_id', userId)
      .eq('viewed_30min_slot', thirtyMinSlot.toISOString())
      .single()
    
    if (existingView) {
      // 既に同じ30分スロット内で閲覧済み
      return { success: true, incremented: false }
    }
    
    // views_logに新しいレコードを追加
    const { error: logError } = await supabase
      .from('views_log')
      .insert({
        work_id: workId,
        user_id: userId,
        viewed_at: now.toISOString(),
        viewed_date: viewedDate,
        viewed_30min_slot: thirtyMinSlot.toISOString()
      })
    
    if (logError) {
      console.error('views_log 挿入エラー:', logError)
      return { error: '閲覧ログの保存に失敗しました' }
    }
    
    // worksテーブルのviewsカウンターをインクリメント
    const { error: updateError } = await supabase
      .rpc('increment_work_views', { work_id: workId })
    
    if (updateError) {
      console.error('views カウンター更新エラー:', updateError)
      // ログ挿入は成功したが、カウンター更新が失敗した場合でも成功として扱う
    }
    
    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag('works')
    
    return { success: true, incremented: true }
  } catch (error) {
    console.error('閲覧数更新例外:', error)
    return { error: '閲覧数の更新に失敗しました' }
  }
}

/**
 * シェア行動を記録
 */
export async function recordShareAction(
  workId: string, 
  shareType: 'twitter' | 'facebook' | 'line' | 'copy_link' | 'native',
  sharedUrl?: string,
  shareText?: string
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // シェアを記録
    const { data, error } = await supabase
      .from('shares')
      .insert({
        user_id: user.id,
        work_id: workId,
        share_type: shareType,
        shared_url: sharedUrl || null,
        share_text: shareText || null
      })
      .select()
      .single()

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag(`user:${user.id}:shares`)

    return { success: true, share: data }
  } catch (error) {
    console.error('シェア記録エラー:', error)
    return { error: 'シェア記録に失敗しました' }
  }
}

/**
 * 閲覧履歴を追加で取得（ページネーション用）
 */
export async function getMoreReadingHistoryAction(userId: string, limit = 6, offset = 0) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  // 自分の履歴のみ取得可能
  if (user.id !== userId) {
    return { error: '権限がありません' }
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Getting more reading history...', { userId, limit, offset })
    }
    
    const { data, error } = await supabase
      .from('reading_progress')
      .select(`
        work_id,
        progress_percentage,
        last_read_position,
        last_read_at,
        first_read_at,
        works!inner (
          work_id,
          title,
          category,
          views,
          views_count,
          likes,
          likes_count,
          comments,
          comments_count,
          created_at,
          tags,
          description,
          image_url,
          series_id,
          episode_number,
          use_series_image,
          is_published,
          users (
            username
          ),
          series (
            id,
            title,
            cover_image_url
          )
        )
      `)
      .eq('user_id', userId)
      .gte('progress_percentage', 1) // 1%以上読んだ作品のみ
      .eq('works.is_published', true) // 公開されている作品のみ
      .order('last_read_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    if (process.env.NODE_ENV === 'development') {
      console.log('More reading history retrieved:', data?.length || 0, 'works')
    }

    const works = data.map((item: any) => ({
      ...item.works,
      author: item.works.users?.username || 'Unknown',
      author_username: item.works.users?.username || 'Unknown',
      series_title: item.works.series?.title || null,
      series_cover_image_url: item.works.series?.cover_image_url || null,
      readingProgress: Math.round(item.progress_percentage),
      readingPosition: item.last_read_position,
      lastReadAt: item.last_read_at,
      firstReadAt: item.first_read_at,
      // 新旧両方の形式をサポート
      views: item.works.views_count || item.works.views || 0,
      likes: item.works.likes || 0,
      comments: item.works.comments_count || item.works.comments || 0
    }))

    return { success: true, works }
  } catch (error) {
    console.error('閲覧履歴追加取得エラー:', error)
    return { error: '閲覧履歴の取得に失敗しました' }
  }
}