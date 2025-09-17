import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { Work } from '../types'

export const getWorks = cache(async (limit = 10, offset = 0) => {
  const supabase = await createClient()
  
  
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

export const getUserReadingHistory = cache(async (userId: string, limit = 6, offset = 0) => {
  const supabase = await createClient()
  
  
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
    .gte('progress_percentage', 1) // 1%以上読んだ作品のみ（軽く触れたレベルから）
    .eq('works.is_published', true) // 公開されている作品のみ
    .order('last_read_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('閲覧履歴取得エラー:', error)
    return []
  }


  return data.map((item: any) => ({
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
  })) as Work[]
})

// 基本作品データのキャッシュ関数を生成（PostgreSQL関数版）
const createCachedWorkData = (workId: string) => unstable_cache(
  async () => {
    const supabase = await createClient()

    // 最適化されたPostgreSQL関数を使用
    const { data, error } = await supabase.rpc('get_work_with_series_info', {
      p_work_id: workId
    })

    if (error || !data || data.length === 0) {
      console.warn('PostgreSQL関数が利用できません。フォールバックを使用:', error?.message)
      
      // フォールバック: 従来のクエリ
      const fallbackResult = await supabase
        .from('works')
        .select(`
          work_id,
          title,
          content,
          description,
          category,
          tags,
          views_count,
          likes_count,
          comments_count,
          is_published,
          scheduled_at,
          created_at,
          updated_at,
          series_id,
          episode_number,
          image_url,
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
        .eq('work_id', workId)
        .single()
      
      if (fallbackResult.error || !fallbackResult.data) {
        console.error('作品詳細取得エラー:', { workId, error: fallbackResult.error })
        return null
      }
      
      return fallbackResult.data
    }

    // PostgreSQL関数の結果を従来の形式に変換
    const workData = data[0]
    return {
      ...workData,
      users: { username: workData.author_username },
      series: workData.series_id ? {
        id: workData.series_id,
        title: workData.series_title,
        cover_image_url: workData.series_cover_url
      } : null,
      // シリーズ作品情報を追加
      series_works: workData.series_works || []
    }
  },
  [`work-data-${workId}`],
  {
    revalidate: 1800, // 30分
    tags: [`work-${workId}`]
  }
)

export const getWorkById = cache(async (workId: string): Promise<Work | null> => {
  const getCachedWorkData = createCachedWorkData(workId)
  const data = await getCachedWorkData()
  
  if (!data) {
    return null
  }

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

// ユーザーの作品との相互作用状態を統合取得（PostgreSQL関数版）
export const getUserWorkInteractions = cache(async (userId: string, workId: string) => {
  if (!userId) {
    return {
      isLiked: false,
      isBookmarked: false,
      readingProgress: 0
    }
  }

  const supabase = await createClient()
  
  // 最適化されたPostgreSQL関数を使用（単一クエリ）
  const { data, error } = await supabase.rpc('get_user_work_interactions', {
    p_user_id: userId,
    p_work_id: workId
  })

  if (error || !data || data.length === 0) {
    console.warn('PostgreSQL関数が利用できません。フォールバックを使用:', error?.message)
    
    // フォールバック: 並列クエリ実行
    const [likeResult, bookmarkResult, progressResult] = await Promise.all([
      supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('work_id', workId)
        .maybeSingle(),
      
      supabase
        .from('bookmarks')  
        .select('id')
        .eq('user_id', userId)
        .eq('work_id', workId)
        .maybeSingle(),
      
      supabase
        .from('reading_progress')
        .select('progress_percentage')
        .eq('user_id', userId)
        .eq('work_id', workId)
        .maybeSingle()
    ])

    return {
      isLiked: !!likeResult.data,
      isBookmarked: !!bookmarkResult.data,
      readingProgress: progressResult.data?.progress_percentage || 0
    }
  }

  // PostgreSQL関数の結果を使用
  const result = data[0]
  return {
    isLiked: result.is_liked || false,
    isBookmarked: result.is_bookmarked || false,
    readingProgress: result.reading_progress || 0
  }
})