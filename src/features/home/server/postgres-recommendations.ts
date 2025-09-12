'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import type { RecommendationResult } from '../types'

export interface PostgreSQLRecommendation {
  work_id: string
  title: string
  description?: string
  image_url?: string
  category: string
  tags: string[]
  author: string
  author_username: string
  views: number
  likes: number
  comments: number
  recommendation_score: number
  recommendation_reason: string
  created_at: string
}

/**
 * PostgreSQL推薦システムから推薦を取得
 */
export async function getPostgreSQLRecommendations(
  userId?: string,
  limit = 20,
  offset = 0
): Promise<RecommendationResult | { error: string }> {
  try {
    const supabase = await createClient()
    
    console.log(`🐘 [PostgreSQL推薦] 開始 - userId: ${userId || 'ゲスト'}, limit: ${limit}`)
    
    const startTime = Date.now()
    
    // PostgreSQL推薦関数を呼び出し
    const { data: recommendations, error } = await supabase
      .rpc('get_personalized_recommendations', {
        p_user_id: userId || null,
        p_limit: limit,
        p_offset: offset
      })
    
    const queryTime = Date.now() - startTime
    
    if (error) {
      console.error('❌ PostgreSQL推薦エラー:', error)
      return { error: '推薦の取得に失敗しました' }
    }
    
    if (!recommendations || recommendations.length === 0) {
      console.log('⚠️ PostgreSQL推薦結果なし')
      // フォールバック: 人気作品を取得
      return await getPopularWorksFallback()
    }
    
    console.log(`✅ PostgreSQL推薦完了 - ${recommendations.length}件 (${queryTime}ms)`)
    
    // 戦略を推測（最初の推薦理由から）
    const firstReason = recommendations[0]?.recommendation_reason || ''
    let strategy: 'personalized' | 'adaptive' | 'popular'
    let source: string
    
    if (firstReason.includes('フォロー') || firstReason.includes('類似') || firstReason.includes('好み')) {
      strategy = 'personalized'
      source = 'あなたの好みから'
    } else if (firstReason.includes('人気')) {
      strategy = 'popular'
      source = '人気作品から'
    } else {
      strategy = 'adaptive'
      source = 'あなたの興味と人気作品から'
    }
    
    // データを期待される形式に変換
    const works = recommendations.map((rec: PostgreSQLRecommendation) => ({
      work_id: rec.work_id,
      title: rec.title,
      description: rec.description,
      image_url: rec.image_url,
      category: rec.category,
      tags: rec.tags,
      author: rec.author,
      author_username: rec.author_username,
      views: rec.views,
      likes: rec.likes,
      comments: rec.comments,
      created_at: rec.created_at,
      recommendation_score: rec.recommendation_score,
      recommendation_reason: rec.recommendation_reason,
      // フォールバック値
      trend_score: Math.round(rec.recommendation_score * 10),
      user_id: null // プライバシー保護
    }))
    
    return {
      works,
      strategy,
      source,
      total: works.length,
      queryTime: `${queryTime}ms`,
      engine: 'PostgreSQL'
    }
    
  } catch (error) {
    console.error('❌ PostgreSQL推薦例外:', error)
    
    // フォールバック: 従来のNode.js推薦システムを使用
    console.log('🔄 フォールバック: 従来システムに切り替え')
    
    try {
      const { getRecommendationsAction } = await import('./recommendations')
      return await getRecommendationsAction(userId, [], limit)
    } catch (fallbackError) {
      console.error('❌ フォールバック推薦も失敗:', fallbackError)
      return { error: '推薦システムが一時的に利用できません' }
    }
  }
}

/**
 * キャッシュ済み人気作品フォールバック（_internalスキーマ対応）
 */
const getPopularWorksFallback = unstable_cache(
  async (): Promise<RecommendationResult | { error: string }> => {
    try {
      const supabase = await createClient()
      
      // _internalスキーマのマテリアライズドビューにアクセスするため、
      // 専用のRPC関数を使用
      const { data: popularWorks, error } = await supabase
        .rpc('get_popular_works_fallback', { p_limit: 20 })
      
      if (error || !popularWorks?.length) {
        console.error('人気作品フォールバック取得エラー:', error)
        return { error: '人気作品の取得に失敗しました' }
      }
      
      return {
        works: popularWorks.map((work: any) => ({
          work_id: work.work_id,
          title: work.title,
          description: work.description,
          image_url: work.image_url,
          category: work.category,
          tags: work.tags,
          author: work.author,
          author_username: work.author_username,
          views: work.views,
          likes: work.likes,
          comments: work.comments,
          created_at: work.created_at,
          trend_score: work.trend_score,
          recommendation_score: Math.round((work.trend_score || 0) / 10 * 100) / 100,
          recommendation_reason: '人気作品',
          user_id: null // プライバシー保護
        })),
        strategy: 'popular' as const,
        source: '人気作品',
        total: popularWorks.length,
        queryTime: '0ms', // フォールバック用
        engine: 'PostgreSQL (Fallback)'
      }
    } catch (error) {
      console.error('人気作品フォールバック失敗:', error)
      return { error: 'システムエラーが発生しました' }
    }
  },
  ['popular-works-fallback'],
  { revalidate: 900 } // 15分キャッシュ
)

/**
 * 推薦キャッシュの手動更新
 */
export async function refreshRecommendationCache(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient()
    
    console.log('🔄 推薦キャッシュ手動更新開始...')
    
    const { error } = await supabase.rpc('refresh_recommendation_cache')
    
    if (error) {
      console.error('❌ 推薦キャッシュ更新エラー:', error)
      return { 
        success: false, 
        message: `更新に失敗しました: ${error.message}` 
      }
    }
    
    console.log('✅ 推薦キャッシュ手動更新完了')
    
    return { 
      success: true, 
      message: '推薦キャッシュが正常に更新されました' 
    }
    
  } catch (error) {
    console.error('❌ 推薦キャッシュ手動更新例外:', error)
    return { 
      success: false, 
      message: `システムエラー: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * 推薦統計の取得
 */
export const getRecommendationStats = unstable_cache(
  async () => {
    try {
      const supabase = await createClient()
      
      const { data: stats, error } = await supabase.rpc('get_recommendation_stats')
      
      if (error) {
        console.error('推薦統計取得エラー:', error)
        return null
      }
      
      return stats
    } catch (error) {
      console.error('推薦統計例外:', error)
      return null
    }
  },
  ['recommendation-stats'],
  { revalidate: 300 } // 5分キャッシュ
)

/**
 * A/Bテスト用: PostgreSQLとNode.js推薦の比較
 */
export async function getRecommendationComparison(
  userId?: string,
  limit = 10
): Promise<{
  postgresql: RecommendationResult | { error: string }
  nodejs: RecommendationResult | { error: string }
  comparison: {
    postgresql_time: string
    nodejs_time: string
    overlap_count: number
  }
}> {
  const startPostgreSQL = Date.now()
  const postgresqlResult = await getPostgreSQLRecommendations(userId, limit)
  const postgresqlTime = `${Date.now() - startPostgreSQL}ms`
  
  const startNodeJS = Date.now()
  const { getRecommendationsAction } = await import('./recommendations')
  const nodejsResult = await getRecommendationsAction(userId, [], limit)
  const nodejsTime = `${Date.now() - startNodeJS}ms`
  
  // 重複作品数を計算
  let overlapCount = 0
  if ('works' in postgresqlResult && 'works' in nodejsResult) {
    const postgresqlIds = new Set(postgresqlResult.works.map(w => w.work_id))
    const nodejsIds = new Set(nodejsResult.works.map(w => w.work_id))
    overlapCount = [...postgresqlIds].filter(id => nodejsIds.has(id)).length
  }
  
  return {
    postgresql: postgresqlResult,
    nodejs: nodejsResult,
    comparison: {
      postgresql_time: postgresqlTime,
      nodejs_time: nodejsTime,
      overlap_count: overlapCount
    }
  }
}