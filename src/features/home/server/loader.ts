import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import type { UserBehaviorData } from '../types'
import { getQualityNewWorksWithCTR } from './qualityFilter'

// 認証不要な公開クライアント
const createPublicClient = () => {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * ユーザーの行動データ統計を取得（cookiesエラー回避版）
 */
export const getUserBehaviorData = cache(async (userId: string): Promise<UserBehaviorData> => {
  const supabase = await createClient()
  
  // 各行動の件数を並行取得
  const [likesResult, bookmarksResult, viewsResult, sharesResult, commentsResult, followsResult] = await Promise.all([
    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('views_log').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('shares').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('reviews').select('review_id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId)
  ])

  // エラーチェック
  if (likesResult.error) console.error('❌ likes取得エラー:', likesResult.error)
  if (bookmarksResult.error) console.error('❌ bookmarks取得エラー:', bookmarksResult.error)
  if (viewsResult.error) console.error('❌ views_log取得エラー:', viewsResult.error)
  if (sharesResult.error) console.error('❌ shares取得エラー:', sharesResult.error)
  if (commentsResult.error) console.error('❌ reviews取得エラー:', commentsResult.error)
  if (followsResult.error) console.error('❌ follows取得エラー:', followsResult.error)

  const behaviorData = {
    likes_count: likesResult.count || 0,
    bookmarks_count: bookmarksResult.count || 0,
    views_count: viewsResult.count || 0,
    shares_count: sharesResult.count || 0,
    comments_count: commentsResult.count || 0,
    follows_count: followsResult.count || 0
  }

  const totalActions = Object.values(behaviorData).reduce((sum, count) => sum + count, 0)

  return behaviorData
})

/**
 * ユーザーがインタラクションした作品のカテゴリ・タグ分析（cookiesエラー回避版）
 */
export const getUserPreferences = cache(async (userId: string) => {
  const supabase = await createClient()
  
  // 直近30日のユーザー行動から好みを分析
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)


  // 簡略化したクエリでユーザーが行動した作品を取得
  const [likesResult, bookmarksResult, commentsResult, viewsResult] = await Promise.all([
    supabase.from('likes').select('work_id').eq('user_id', userId).gte('liked_at', thirtyDaysAgo.toISOString()),
    supabase.from('bookmarks').select('work_id').eq('user_id', userId).gte('bookmarked_at', thirtyDaysAgo.toISOString()),
    supabase.from('reviews').select('work_id').eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('views_log').select('work_id').eq('user_id', userId).gte('viewed_at', thirtyDaysAgo.toISOString())
  ])

  // エラーチェック
  if (likesResult.error) console.error('❌ likes取得エラー:', likesResult.error)
  if (bookmarksResult.error) console.error('❌ bookmarks取得エラー:', bookmarksResult.error)
  if (commentsResult.error) console.error('❌ reviews取得エラー:', commentsResult.error)
  if (viewsResult.error) console.error('❌ views_log取得エラー:', viewsResult.error)

  // 作品IDを重み付きで集計
  const workWeights: Record<string, number> = {}
  
  // 各行動タイプに重みを付ける
  likesResult.data?.forEach(l => workWeights[l.work_id] = (workWeights[l.work_id] || 0) + 10) // いいね: 高重み
  bookmarksResult.data?.forEach(b => workWeights[b.work_id] = (workWeights[b.work_id] || 0) + 15) // ブックマーク: 最高重み
  commentsResult.data?.forEach(c => workWeights[c.work_id] = (workWeights[c.work_id] || 0) + 8) // コメント: 中重み
  
  // 視聴履歴：基本重み + リピート視聴ボーナス
  const viewCounts: Record<string, number> = {}
  viewsResult.data?.forEach(v => {
    viewCounts[v.work_id] = (viewCounts[v.work_id] || 0) + 1
  })
  
  Object.entries(viewCounts).forEach(([workId, count]) => {
    const baseWeight = 3 // 基本視聴重み
    const repeatBonus = Math.min(count - 1, 3) * 2 // リピート視聴ボーナス（最大6ポイント）
    workWeights[workId] = (workWeights[workId] || 0) + baseWeight + repeatBonus
  })

  const workIds = new Set(Object.keys(workWeights))


  if (workIds.size === 0) {
    return { categories: [], tags: [] }
  }

  // 作品の詳細情報を取得
  const { data: works, error } = await supabase
    .from('works')
    .select('work_id, category, tags')
    .in('work_id', Array.from(workIds))

  if (error) {
    console.error('❌ works取得エラー:', error)
    return { categories: [], tags: [] }
  }


  // カテゴリ・タグごとの重みを計算
  const categoryWeights: Record<string, number> = {}
  const tagWeights: Record<string, number> = {}

  works?.forEach(work => {
    const weight = workWeights[work.work_id] || 1 // デフォルト重み
    
    // カテゴリ重み付け（行動の重要度を反映）
    if (work.category) {
      categoryWeights[work.category] = (categoryWeights[work.category] || 0) + weight
    }
    
    // タグ重み付け（行動の重要度を反映）
    work.tags?.forEach((tag: string) => {
      tagWeights[tag] = (tagWeights[tag] || 0) + weight
    })
  })

  const preferences = {
    categories: Object.entries(categoryWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, weight]) => ({ category, weight })),
    tags: Object.entries(tagWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, weight]) => ({ tag, weight }))
  }


  return preferences
})

/**
 * フォロー中の作者の作品を取得
 */
export const getFollowedAuthorsWorks = cache(async (userId: string, limit = 10) => {
  const supabase = await createClient()
  
  // まずフォローしているユーザーIDを取得
  const { data: followedUsers, error: followError } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', userId)
    .eq('status', 'approved')

  if (followError) {
    console.error('❌ follows取得エラー:', followError)
    return []
  }


  if (!followedUsers?.length) {
    return []
  }

  const followedUserIds = followedUsers.map(f => f.followed_id)

  // フォロー中の作者の作品を取得
  const { data: works, error } = await supabase
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
      episode_number,
      is_published,
      views_count,
      likes_count,
      comments_count,
      trend_score,
      recent_views_24h,
      recent_views_7d,
      recent_views_30d
    `)
    .eq('is_published', true)
    .in('user_id', followedUserIds)
    .order('trend_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('❌ フォロー作者作品取得エラー:', error)
    return []
  }


  if (!works?.length) {
    return []
  }

  // ユーザー情報を別途取得
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', followedUserIds)

  if (userError) {
    console.error('❌ ユーザー情報取得エラー:', userError)
  }


  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user
    return acc
  }, {} as { [key: string]: any }) || {}

  const result = works.map(work => ({
    ...work,
    author: userMap[work.user_id]?.username || '不明',
    author_username: userMap[work.user_id]?.username,
    // 統計カラムを直接利用
    views: work.views_count || 0,
    likes: work.likes_count || 0,
    comments: work.comments_count || 0
  }))

  return result
})

/**
 * 人気作品を取得（全体統計ベース）
 */
export const getPopularWorks = unstable_cache(
  async (limit = 20) => {
  const supabase = createPublicClient()
  
  let { data: works, error } = await supabase
    .from('works')
    .select(`
      work_id,
      title,
      description,
      image_url,
      category,
      tags,
      created_at,
      user_id,
      series_id,
      episode_number,
      views_count,
      likes_count,
      comments_count,
      trend_score
    `)
    .eq('is_published', true)
    .order('trend_score', { ascending: false })
    .order('likes_count', { ascending: false })
    .order('views_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('人気作品取得エラー:', error)
    return []
  }

  if (!works?.length) {
    console.log('人気作品が見つかりませんでした。条件を緩和して再試行...')
    
    // 条件を緩和して再度取得
    const fallbackResult = await supabase
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
        episode_number,
        is_published,
        views_count,
        likes_count,
        comments_count,
        trend_score,
        recent_views_24h,
        recent_views_7d,
        recent_views_30d
      `)
      .eq('is_published', true)
      .order('views_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (!fallbackResult.data?.length) {
      console.log('条件緩和後も作品が見つかりませんでした')
      return []
    }
    
    works = fallbackResult.data
  }

  // ユーザー情報を別途取得
  const userIds = [...new Set(works.map(work => work.user_id).filter(Boolean))]
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)

  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user
    return acc
  }, {} as { [key: string]: any }) || {}

  return works.map(work => ({
    ...work,
    author: userMap[work.user_id]?.username || '不明',
    author_username: userMap[work.user_id]?.username,
    // 統計カラムを直接利用
    views: work.views_count || 0,
    likes: work.likes_count || 0,
    comments: work.comments_count || 0
  }))
  },
  ['popular-works'],
  { 
    revalidate: 900, // 15分キャッシュ（高速化のため短縮）
    tags: ['popular-works']
  }
)

/**
 * 新着優良作品を取得
 */
export const getQualityNewWorks = async (limit = 10) => {
  const result = await getQualityNewWorksWithCTR(limit)
  
  return result
}

/**
 * チャレンジ推薦用作品を取得（ユーザーの嗜好から離れた作品）
 */
export const getChallengeWorks = cache(async (userId: string, userCategories: string[], userTags: string[], limit = 10) => {
  const supabase = await createClient()
  
  // ユーザーが過去に行動した作品IDを取得（除外用）
  const [likesResult, bookmarksResult, viewsResult] = await Promise.all([
    supabase.from('likes').select('work_id').eq('user_id', userId),
    supabase.from('bookmarks').select('work_id').eq('user_id', userId),
    supabase.from('views_log').select('work_id').eq('user_id', userId)
  ])

  const interactedWorkIds = new Set([
    ...(likesResult.data?.map(l => l.work_id) || []),
    ...(bookmarksResult.data?.map(b => b.work_id) || []),
    ...(viewsResult.data?.map(v => v.work_id) || [])
  ])


  // チャレンジ作品の種類別取得
  const challengeWorks: any[] = []

  // 1. 未経験カテゴリの作品
  if (userCategories.length > 0) {
    const { data: unexploredWorks } = await supabase
      .from('works')
      .select(`
        work_id, title, description, image_url, category, tags,
        created_at, updated_at, user_id, series_id, episode_number,
        is_published, views, likes, comments, trend_score,
        recent_views_24h, recent_views_7d
      `)
      .eq('is_published', true)
      .not('category', 'in', `(${userCategories.join(',')})`)
      .not('work_id', 'in', `(${Array.from(interactedWorkIds).join(',') || 'null'})`)
      .gt('views_count', 10) // 品質フィルタ
      .order('likes_count', { ascending: false })
      .limit(Math.ceil(limit / 3))

    if (unexploredWorks?.length) {
      challengeWorks.push(...unexploredWorks)
    }
  }

  // 2. 新人作家の作品（フォローしていない作家）
  const { data: followedUsers } = await supabase
    .from('follows')
    .select('followed_id')
    .eq('follower_id', userId)
    .eq('status', 'approved')

  const followedUserIds = followedUsers?.map(f => f.followed_id) || []
  
  if (followedUserIds.length > 0) {
    const { data: newAuthorWorks } = await supabase
      .from('works')
      .select(`
        work_id, title, description, image_url, category, tags,
        created_at, updated_at, user_id, series_id, episode_number,
        is_published, views, likes, comments, trend_score,
        recent_views_24h, recent_views_7d
      `)
      .eq('is_published', true)
      .not('user_id', 'in', `(${followedUserIds.join(',')})`)
      .neq('user_id', userId) // 自分の作品も除外
      .not('work_id', 'in', `(${Array.from(interactedWorkIds).join(',') || 'null'})`)
      .gt('views_count', 15) // やや高めの品質フィルタ
      .order('created_at', { ascending: false }) // 新しい作品優先
      .limit(Math.ceil(limit / 3))

    if (newAuthorWorks?.length) {
      challengeWorks.push(...newAuthorWorks)
    }
  }

  // 3. 急上昇作品（最近人気だが未読）
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: trendingWorks } = await supabase
    .from('works')
    .select(`
      work_id, title, description, image_url, category, tags,
      created_at, updated_at, user_id, series_id, episode_number,
      is_published, views, likes, comments, trend_score,
      recent_views_24h, recent_views_7d
    `)
    .eq('is_published', true)
    .not('work_id', 'in', `(${Array.from(interactedWorkIds).join(',') || 'null'})`)
    .neq('user_id', userId)
    .gte('updated_at', sevenDaysAgo.toISOString()) // 最近更新
    .gt('likes_count', 5) // 一定のいいね数
    .order('likes_count', { ascending: false })
    .order('views_count', { ascending: false })
    .limit(Math.ceil(limit / 3))

  if (trendingWorks?.length) {
    challengeWorks.push(...trendingWorks)
  }

  // 重複を除去
  const uniqueChallengeWorks = challengeWorks.filter((work, index, self) => 
    index === self.findIndex(w => w.work_id === work.work_id)
  ).slice(0, limit)

  // ユーザー情報を取得
  const userIds = [...new Set(uniqueChallengeWorks.map(work => work.user_id).filter(Boolean))]
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)

  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user
    return acc
  }, {} as { [key: string]: any }) || {}

  const result = uniqueChallengeWorks.map(work => ({
    ...work,
    author: userMap[work.user_id]?.username || '不明',
    author_username: userMap[work.user_id]?.username
  }))

  return result
})