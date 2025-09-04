import { createClient } from '@/lib/supabase/server'
import type { Work } from '../types'

export async function getWorks(limit = 10, offset = 0) {
  const supabase = await createClient()
  
  console.log('Getting works list...')
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      *,
      users (
        username
      )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('作品取得エラー:', error, JSON.stringify(error, null, 2))
    return []
  }

  console.log('Works retrieved:', data?.length || 0, 'works')

  return data.map((work: any) => ({
    ...work,
    author: work.users?.username || 'Unknown',
    author_username: work.users?.username || 'Unknown'
  })) as Work[]
}

export async function getWorksByCategory(category: string, limit = 10, offset = 0) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      *,
      users (
        username
      )
    `)
    .eq('category', category)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('カテゴリ別作品取得エラー:', error)
    return []
  }

  return data.map((work: any) => ({
    ...work,
    author: work.users?.username || 'Unknown',
    author_username: work.users?.username || 'Unknown'
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

export async function getWorkById(workId: string): Promise<Work | null> {
  const supabase = await createClient()
  
  console.log('Getting work by ID:', workId)
  
  // まず、テーブル全体の状況を確認
  try {
    const { data: allWorks, error: countError } = await supabase
      .from('works')
      .select('work_id, title')
      .limit(5)
    
    console.log('Available works in database:', allWorks?.map(w => ({ id: w.work_id, title: w.title })))
    console.log('Count error if any:', countError)
  } catch (e) {
    console.log('Error checking works table:', e)
  }

  const { data, error } = await supabase
    .from('works')
    .select(`
      *,
      users (
        username
      )
    `)
    .eq('work_id', workId)
    .single()

  console.log('Query result:', { data: !!data, error, errorCode: error?.code, errorMessage: error?.message })

  if (error || !data) {
    console.error('作品詳細取得エラー:', { workId, error, errorDetails: JSON.stringify(error, null, 2) })
    return null
  }

  console.log('Work data retrieved:', { title: data.title, author: data.users?.username })

  return {
    ...data,
    author: data.users?.username || 'Unknown',
    author_username: data.users?.username || 'Unknown'
  } as Work
}