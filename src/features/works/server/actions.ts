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
          user_id: user.id
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
 * ブックマークフォルダ一覧を取得
 */
export async function getBookmarkFoldersAction() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { data: folders, error } = await supabase
      .from('bookmark_folders')
      .select('id, folder_key, folder_name, is_private, is_system')
      .eq('user_id', user.id)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, folders: folders || [] }
  } catch (error) {
    console.error('ブックマークフォルダ取得エラー:', error)
    return { error: 'フォルダの取得に失敗しました' }
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
    if (folderKeys.length > 0) {
      // JSON形式で複数フォルダを保存（既存制約に対応）
      const { error: upsertError } = await supabase
        .from('bookmarks')
        .upsert({
          user_id: user.id,
          work_id: workId,
          folder: JSON.stringify(folderKeys), // 配列をJSONとして保存
          memo: memo || null,
          is_private: false,
          bookmarked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (upsertError) throw upsertError
    } else {
      // フォルダが選択されていない場合は削除
      await supabase
        .from('bookmarks')
        .delete()
        .eq('work_id', workId)
        .eq('user_id', user.id)
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
      const bookmark = bookmarks[0]
      try {
        // folder列がJSON形式の場合はパース、そうでなければ単一文字列として扱う
        const folderKeys = bookmark.folder ? 
          (bookmark.folder.startsWith('[') ? 
            JSON.parse(bookmark.folder) : 
            [bookmark.folder]
          ) : []
        return { success: true, folderKeys, memo: bookmark.memo || '' }
      } catch (parseError) {
        console.error('フォルダキーのパースエラー:', parseError)
        // パースに失敗した場合は単一文字列として扱う
        const folderKeys = bookmark.folder ? [bookmark.folder] : []
        return { success: true, folderKeys, memo: bookmark.memo || '' }
      }
    }

    return { success: true, folderKeys: [], memo: '' }
  } catch (error) {
    console.error('ブックマークフォルダ取得エラー:', error)
    return { error: 'ブックマークフォルダの取得に失敗しました' }
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