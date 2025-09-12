import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getUserPreferences, getUserBehaviorData } from './loader'
import type { Work } from '@/features/works/types'

export interface TagWorksGroup {
  tag: string
  works: Work[]
}

export interface UserTagsResult {
  isWarm: boolean
  tagGroups: TagWorksGroup[]
}

/**
 * 人気タグTOP5を取得（コールドユーザー用）
 */
const getPopularTags = cache(async (limit = 3): Promise<string[]> => {
  const supabase = await createClient()
  
  // 過去30日の作品から人気タグを集計
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: works, error } = await supabase
    .from('works')
    .select('tags, views_count')
    .eq('is_published', true)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .not('tags', 'is', null)
    .order('views_count', { ascending: false })
    .limit(200) // 上位200作品から分析
  
  if (error || !works) {
    console.error('人気タグ取得エラー:', error)
    // フォールバック用デフォルトタグ
    return ['恋愛', 'ファンタジー', '日常']
  }
  
  // タグ別の総閲覧数を集計
  const tagViewCounts: Record<string, number> = {}
  
  works.forEach(work => {
    work.tags?.forEach((tag: string) => {
      tagViewCounts[tag] = (tagViewCounts[tag] || 0) + (work.views_count || 0)
    })
  })
  
  // 閲覧数順でソートして上位タグを返す
  return Object.entries(tagViewCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag]) => tag)
})

/**
 * 特定タグの人気作品を取得
 */
export const getWorksByTag = cache(async (
  tag: string, 
  sortBy: 'views_all' | 'views_month' | 'views_week' | 'views_day' | 'created_at' = 'views_all',
  limit = 3,
  excludeWorkIds: string[] = []
): Promise<Work[]> => {
  const supabase = await createClient()
  
  // ソート条件を決定
  let orderColumn: string
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
  
  let query = supabase
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
    .eq('is_published', true)
    .contains('tags', [tag])
    .order(orderColumn, { ascending: false })
    .limit(limit * 2) // 除外後も十分な数を確保
  
  // 除外作品がある場合
  if (excludeWorkIds.length > 0) {
    query = query.not('work_id', 'in', `(${excludeWorkIds.join(',')})`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error(`タグ「${tag}」の作品取得エラー:`, error)
    return []
  }
  
  const works = data?.slice(0, limit).map((work: any) => ({
    ...work,
    author: work.users?.username || 'Unknown',
    author_username: work.users?.username || 'Unknown',
    series_title: work.series?.title || null,
    series_cover_image_url: work.series?.cover_image_url || null,
    views: work.views_count || work.views || 0,
    likes: work.likes_count || work.likes || 0,
    comments: work.comments_count || work.comments || 0
  })) || []
  
  return works as Work[]
})

/**
 * ユーザーの好みタグに基づく作品推薦を取得
 */
export const getUserTagsRecommendations = cache(async (
  userId: string | undefined,
  sortBy: 'views_all' | 'views_month' | 'views_week' | 'views_day' | 'created_at' = 'views_all',
  limit = 9
): Promise<UserTagsResult> => {
  console.log(`🏷️ [DEBUG] ユーザータグ推薦開始 - userId: ${userId}, sortBy: ${sortBy}`)
  
  if (!userId) {
    // 未認証ユーザー: 人気タグから作品を取得
    const popularTags = await getPopularTags(3)
    const tagGroups: TagWorksGroup[] = []
    
    for (const tag of popularTags) {
      const works = await getWorksByTag(tag, sortBy, 3)
      if (works.length > 0) {
        tagGroups.push({ tag, works })
      }
    }
    
    return {
      isWarm: false,
      tagGroups: tagGroups.slice(0, Math.ceil(limit / 3))
    }
  }
  
  // ユーザーの行動データ量をチェック（コールドモード判定）
  const behaviorData = await getUserBehaviorData(userId)
  const totalActions = Object.values(behaviorData).reduce((sum, count) => sum + count, 0)
  const isWarm = totalActions >= 10
  
  console.log(`📊 [DEBUG] ユーザー行動数: ${totalActions}, ウォームユーザー: ${isWarm}`)
  
  let targetTags: string[]
  
  if (isWarm) {
    // ウォームユーザー: user_preferences_cache から好みタグを取得
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_preferences_cache', { p_user_id: userId })
      
      if (error) {
        console.error('ユーザー嗜好キャッシュ取得エラー:', error)
        targetTags = await getPopularTags(3)
      } else if (data && data.preferred_tags && data.preferred_tags.length > 0) {
        // キャッシュから上位3つのタグを使用
        targetTags = data.preferred_tags.slice(0, 3)
        console.log(`🎯 [DEBUG] キャッシュからユーザー好みタグ: ${targetTags.join(', ')}`)
      } else {
        // キャッシュにデータがない場合は人気タグを使用
        targetTags = await getPopularTags(3)
        console.log(`🎯 [DEBUG] キャッシュデータなし、人気タグ使用: ${targetTags.join(', ')}`)
      }
    } catch (error) {
      console.error('ユーザー嗜好キャッシュ取得例外:', error)
      targetTags = await getPopularTags(3)
    }
  } else {
    // コールドユーザー: 人気タグを使用
    targetTags = await getPopularTags(3)
    console.log(`🔥 [DEBUG] 人気タグ: ${targetTags.join(', ')}`)
  }
  
  // タグがない場合のフォールバック
  if (targetTags.length === 0) {
    targetTags = await getPopularTags(3)
  }
  
  // 各タグから作品を取得（重複排除）
  const tagGroups: TagWorksGroup[] = []
  const usedWorkIds = new Set<string>()
  const worksPerTag = Math.ceil(limit / targetTags.length)
  
  for (const tag of targetTags) {
    const excludeIds = Array.from(usedWorkIds)
    const works = await getWorksByTag(tag, sortBy, worksPerTag, excludeIds)
    
    // 重複チェックして追加
    const uniqueWorks = works.filter(work => {
      if (usedWorkIds.has(work.work_id)) {
        return false
      }
      usedWorkIds.add(work.work_id)
      return true
    })
    
    if (uniqueWorks.length > 0) {
      tagGroups.push({ tag, works: uniqueWorks })
    }
  }
  
  console.log(`✅ [DEBUG] タググループ数: ${tagGroups.length}, 総作品数: ${Array.from(usedWorkIds).length}`)
  
  return {
    isWarm,
    tagGroups
  }
})

/**
 * キャッシュなしのユーザータグ推薦取得（直接呼び出し）
 */
export const getCachedUserTagsRecommendations = (
  userId: string | undefined,
  sortBy: 'views_all' | 'views_month' | 'views_week' | 'views_day' | 'created_at' = 'views_all',
  limit = 9
) => {
  // キャッシュを使わずに直接実行（cookiesエラーを回避）
  return getUserTagsRecommendations(userId, sortBy, limit)
}