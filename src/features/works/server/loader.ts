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
    .order('created_at', { ascending: true })
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
    series_cover_image_url: work.series?.cover_image_url || null,
    // 新旧両方の形式をサポート
    views: work.views_count || work.views || 0,
    likes: work.likes || 0,
    comments: work.comments_count || work.comments || 0
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
    series_cover_image_url: work.series?.cover_image_url || null,
    // 新旧両方の形式をサポート
    views: work.views_count || work.views || 0,
    likes: work.likes || 0,
    comments: work.comments_count || work.comments || 0
  })) as Work[]
})

export const getWorksByCategoriesWithSort = cache(async (
  categories: string[], 
  sortBy: 'views_all' | 'views_month' | 'views_week' | 'views_day' | 'created_at' = 'views_all',
  limit = 12, 
  offset = 0
) => {
  const supabase = await createClient()
  
  // ソート設定を決定
  let orderColumn: string
  let ascending = false
  
  switch (sortBy) {
    case 'views_all':
      orderColumn = 'views_count'
      break
    case 'views_month':
      orderColumn = 'recent_views_30d'
      break
    case 'views_week':
      orderColumn = 'recent_views_7d'
      break
    case 'views_day':
      orderColumn = 'recent_views_24h'
      break
    case 'created_at':
      orderColumn = 'created_at'
      break
    default:
      orderColumn = 'views_count'
  }
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      work_id,
      title,
      category,
      views,
      views_count,
      recent_views_24h,
      recent_views_7d,
      recent_views_30d,
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
      users (
        username
      ),
      series (
        id,
        title,
        cover_image_url
      )
    `)
    .in('category', categories)
    .eq('is_published', true)
    .order(orderColumn, { ascending })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('複数カテゴリ作品取得エラー:', error)
    return []
  }

  return data.map((work: any) => ({
    ...work,
    author: work.users?.username || 'Unknown',
    author_username: work.users?.username || 'Unknown',
    series_title: work.series?.title || null,
    series_cover_image_url: work.series?.cover_image_url || null,
    // 新旧両方の形式をサポート
    views: work.views_count || work.views || 0,
    likes: work.likes || 0,
    comments: work.comments_count || work.comments || 0
  })) as Work[]
})

export const getUserLikesAndBookmarks = cache(async (userId: string, workIds?: string[]) => {
  const supabase = await createClient()
  
  const likesQuery = supabase
    .from('likes')
    .select('work_id')
    .eq('user_id', userId)
  
  const bookmarksQuery = supabase
    .from('bookmarks')
    .select('work_id')
    .eq('user_id', userId)
  
  // workIdsが指定されている場合は絞り込む
  if (workIds && workIds.length > 0) {
    likesQuery.in('work_id', workIds)
    bookmarksQuery.in('work_id', workIds)
  }
  
  const [likesResult, bookmarksResult] = await Promise.all([
    likesQuery,
    bookmarksQuery
  ])

  const userLikes = likesResult.data?.map(like => like.work_id) || []
  const userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.work_id) || []

  return {
    userLikes,
    userBookmarks,
    // 互換性のため古い名前も残す
    likedWorkIds: userLikes,
    bookmarkedWorkIds: userBookmarks
  }
})

/**
 * ユーザーの全ての読書進捗を取得（作品IDをキーとしたRecord形式）
 */
export const getUserReadingProgress = cache(async (userId: string): Promise<Record<string, number>> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reading_progress')
    .select('work_id, progress_percentage')
    .eq('user_id', userId)
    .gt('progress_percentage', 0) // 進捗がある作品のみ
    .is('completed_at', null) // 完了していない作品のみ

  if (error) {
    console.error('読書進捗取得エラー:', error)
    return {}
  }

  // Record<string, number>形式に変換
  const progressMap: Record<string, number> = {}
  data.forEach(item => {
    progressMap[item.work_id] = Math.round(item.progress_percentage)
  })

  return progressMap
})

export const getContinueReadingWorks = cache(async (userId: string) => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reading_progress')
    .select(`
      work_id,
      progress_percentage,
      last_read_position,
      last_read_at,
      works!inner (
        *,
        users (
          username
        ),
        series (
          id,
          title
        )
      )
    `)
    .eq('user_id', userId)
    .gt('progress_percentage', 5) // 5%以上読んだ作品のみ
    .lt('progress_percentage', 100) // 100%完了は除外
    .is('completed_at', null) // 完了していない作品のみ
    .order('last_read_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('続きを読む作品取得エラー:', error)
    return []
  }

  return data.map((item: any) => ({
    ...item.works,
    author: item.works.users?.username || item.works.author,
    readingProgress: Math.round(item.progress_percentage),
    readingPosition: item.last_read_position,
    lastReadAt: item.last_read_at,
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
    series_cover_image_url: data.series?.cover_image_url || null,
    // 新旧両方の形式をサポート
    views: data.views_count || data.views || 0,
    likes: data.likes || 0,
    comments: data.comments_count || data.comments || 0
  } as Work
})