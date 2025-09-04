import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { Work } from '../types'

export const getWorks = cache(async (limit = 10, offset = 0) => {
  const supabase = await createClient()
  
  console.log('Getting works list...')
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      work_id,
      title,
      category,
      views,
      created_at,
      tags,
      likes,
      comments,
      description,
      image_url,
      series_id,
      episode_number,
      use_series_image,
      users (
        username
      ),
      series (
        id,
        title,
        cover_image_url
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
    author_username: work.users?.username || 'Unknown',
    series_title: work.series?.title || null,
    series_cover_image_url: work.series?.cover_image_url || null
  })) as Work[]
})

export const getWorksByCategory = cache(async (category: string, limit = 10, offset = 0) => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      *,
      users (
        username
      ),
      series (
        id,
        title,
        cover_image_url
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
    author_username: work.users?.username || 'Unknown',
    series_title: work.series?.title || null,
    series_cover_image_url: work.series?.cover_image_url || null
  })) as Work[]
})

export const getUserLikesAndBookmarks = cache(async (userId: string, workIds: string[]) => {
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
})

export const getContinueReadingWorks = cache(async (userId: string) => {
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
        ),
        series (
          id,
          title
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
    series_title: item.works.series?.title || null
  })) as Work[]
})

export const getWorkById = cache(async (workId: string): Promise<Work | null> => {
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
      ),
      series (
        id,
        title,
        cover_image_url
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

  // 予約投稿の自動公開判定（すべて日本時間で統一）
  const now = new Date() // 日本時間（サーバーが日本時間設定）
  const scheduledAt = data.scheduled_at ? new Date(data.scheduled_at) : null
  
  console.log('🔍 Auto-publish check (JST):', {
    workId,
    is_published: data.is_published,
    scheduled_at: data.scheduled_at,
    scheduledAt_parsed: scheduledAt?.toString(), // toISOStringではなくtoStringで日本時間表示
    now: now.toString(),
    comparison: scheduledAt ? scheduledAt <= now : 'no scheduled date',
    shouldPublish: scheduledAt ? scheduledAt <= now : false
  })
  
  const shouldBePublished = data.is_published || 
    (scheduledAt && scheduledAt <= now)
  
  if (!data.is_published && shouldBePublished) {
    console.log('🚨 Auto-publishing scheduled work:', workId)
    // データベースを更新して公開状態にする
    await supabase
      .from('works')
      .update({ 
        is_published: true,
        updated_at: new Date().toISOString()
      })
      .eq('work_id', workId)
  }

  return {
    ...data,
    is_published: shouldBePublished, // 動的に公開状態を判定
    author: data.users?.username || 'Unknown',
    author_username: data.users?.username || 'Unknown',
    series_title: data.series?.title || null,
    series_cover_image_url: data.series?.cover_image_url || null
  } as Work
})