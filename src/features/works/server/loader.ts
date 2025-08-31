import { createClient } from '@/lib/supabase/server'
import type { Work } from '../types'

export async function getWorks(limit = 10, offset = 0) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      *,
      users!author_id (
        username
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('作品取得エラー:', error)
    return []
  }

  return data.map((work: any) => ({
    ...work,
    author: work.users?.username || work.author,
  })) as Work[]
}

export async function getWorksByCategory(category: string, limit = 10, offset = 0) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      *,
      users!author_id (
        username
      )
    `)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('カテゴリ別作品取得エラー:', error)
    return []
  }

  return data.map((work: any) => ({
    ...work,
    author: work.users?.username || work.author,
  })) as Work[]
}

export async function getUserLikesAndBookmarks(userId: string, workIds: string[]) {
  const supabase = await createClient()
  
  const [likesResult, bookmarksResult] = await Promise.all([
    supabase
      .from('likes')
      .select('work_id')
      .eq('user_id', userId)
      .in('work_id', workIds),
    supabase
      .from('bookmarks')
      .select('work_id')
      .eq('user_id', userId)
      .in('work_id', workIds)
  ])

  const likedWorkIds = likesResult.data?.map(like => like.work_id) || []
  const bookmarkedWorkIds = bookmarksResult.data?.map(bookmark => bookmark.work_id) || []

  return {
    likedWorkIds,
    bookmarkedWorkIds
  }
}

export async function getContinueReadingWorks(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reading_bookmarks')
    .select(`
      work_id,
      last_position,
      works (
        *,
        users!author_id (
          username
        )
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('続きを読む作品取得エラー:', error)
    return []
  }

  return data.map((item: any) => ({
    ...item.works,
    author: item.works.users?.username || item.works.author,
    readingProgress: item.last_position,
  })) as Work[]
}