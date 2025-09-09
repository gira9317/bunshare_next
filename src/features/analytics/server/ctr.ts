'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

export interface CTRStats {
  work_id: string
  impression_count: number
  unique_clicks: number
  total_clicks: number
  ctr_unique: number // ユニークCTR
  ctr_total: number // 総CTR
  avg_intersection_ratio: number // 平均表示割合
  avg_display_duration: number // 平均表示時間
}

export interface QualityScoreComponents {
  ctr_score: number // CTRベーススコア (0-10)
  engagement_score: number // エンゲージメントスコア (0-10)
  content_quality_score: number // コンテンツ品質スコア (0-10)
  visual_score?: number // 後方互換用
  consistency_score: number // 一貫性スコア (0-10) ※将来のembeddings用
  overall_quality_score: number // 総合品質スコア (0-10)
}

/**
 * 作品別CTR統計を取得
 */
export const getWorkCTRStats = unstable_cache(
  async (workIds: string[] = []): Promise<CTRStats[]> => {
    const supabase = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    let query = supabase.from('work_ctr_stats').select('*')
    
    if (workIds.length > 0) {
      query = query.in('work_id', workIds)
    }
    
    const { data, error } = await query.order('ctr_unique', { ascending: false })
    
    if (error) {
      console.error('CTR統計取得エラー:', error)
      return []
    }
    
    return data || []
  },
  ['work-ctr-stats'],
  { revalidate: 3600 } // 1時間キャッシュ
)

/**
 * CTRからスコアを算出 (0-10点)
 */
function calculateCTRScore(ctr: number): number {
  // CTRの分布を考慮した非線形スケーリング
  // 一般的なCTR: 1-5% → 5-8点
  // 優秀なCTR: 5-15% → 8-10点
  // 例外的CTR: 15%+ → 10点
  
  if (ctr <= 0) return 0
  if (ctr >= 0.15) return 10
  
  // 対数スケーリングでより現実的な分布に
  const logCtr = Math.log10(ctr * 100 + 1) // CTRを%に変換してlog10
  const maxLog = Math.log10(15 + 1) // 15%のlog10
  
  return Math.min(10, Math.max(0, (logCtr / maxLog) * 10))
}

/**
 * エンゲージメントスコアを算出
 */
function calculateEngagementScore(
  avgDisplayDuration: number,
  avgIntersectionRatio: number,
  impressionCount: number
): number {
  let score = 0
  
  // 表示時間スコア (40%)
  if (avgDisplayDuration >= 5000) score += 4 // 5秒以上
  else if (avgDisplayDuration >= 3000) score += 3 // 3秒以上
  else if (avgDisplayDuration >= 2000) score += 2 // 2秒以上
  else if (avgDisplayDuration >= 1000) score += 1 // 1秒以上
  
  // 表示割合スコア (30%)
  if (avgIntersectionRatio >= 0.9) score += 3 // 90%以上表示
  else if (avgIntersectionRatio >= 0.7) score += 2.5 // 70%以上
  else if (avgIntersectionRatio >= 0.5) score += 2 // 50%以上
  else score += 1
  
  // 露出頻度スコア (30%) - 適度な露出が良い
  if (impressionCount >= 1000) score += 3
  else if (impressionCount >= 500) score += 2.5
  else if (impressionCount >= 100) score += 2
  else if (impressionCount >= 50) score += 1.5
  else score += 1
  
  return Math.min(10, score)
}

/**
 * コンテンツ品質スコアを算出（視覚要素 + 文章量）
 */
async function calculateContentQualityScore(workId: string): Promise<number> {
  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: work, error } = await supabase
    .from('works')
    .select('image_url, title, description, content')
    .eq('work_id', workId)
    .single()
  
  if (error || !work) return 0
  
  let score = 0
  
  // 本文の文章量評価 (最重要: 40%)
  const contentLength = work.content?.length || 0
  if (contentLength <= 10) {
    score += 0.1 // 10文字以下は大幅減点
  } else if (contentLength >= 2000) {
    score += 4 // 2000文字以上で満点
  } else if (contentLength >= 1000) {
    score += 3 // 1000文字以上
  } else if (contentLength >= 500) {
    score += 2 // 500文字以上
  } else if (contentLength >= 200) {
    score += 1 // 200文字以上
  } else {
    score += 0.5 // 200文字未満はペナルティ
  }
  
  // 画像有無 (30% - 重要度を下げた)
  if (work.image_url) {
    score += 3 // 画像があれば3点（7点から減らした）
  } else {
    score += 1 // なくても1点
  }
  
  // タイトルの質 (15%)
  if (work.title && work.title.length >= 10 && work.title.length <= 50) {
    score += 1.5
  } else if (work.title && work.title.length > 0) {
    score += 0.5
  }
  
  // 説明の質 (15%)
  if (work.description && work.description.length >= 20) {
    score += 1.5
  } else if (work.description && work.description.length > 0) {
    score += 0.5
  }
  
  return Math.min(10, score)
}

// 後方互換性のためのエイリアス
const calculateVisualScore = calculateContentQualityScore

/**
 * 一貫性スコア（将来のembeddings実装用）
 */
function calculateConsistencyScore(): number {
  // TODO: embeddings実装時に以下を追加:
  // - title, description, contentのベクトル類似度
  // - カテゴリとタグの一貫性
  // - シリーズ内での品質一貫性
  
  return 5 // 暫定的に中間値
}

/**
 * 作品の品質スコア構成要素を計算
 */
export async function calculateQualityScoreComponents(
  workId: string
): Promise<QualityScoreComponents> {
  // CTR統計を取得
  const ctrStats = await getWorkCTRStats([workId])
  const stats = ctrStats[0] || {
    ctr_unique: 0,
    avg_display_duration: 1000,
    avg_intersection_ratio: 0.5,
    impression_count: 0
  }
  
  // 各スコア要素を計算
  const ctr_score = calculateCTRScore(stats.ctr_unique)
  const engagement_score = calculateEngagementScore(
    stats.avg_display_duration,
    stats.avg_intersection_ratio,
    stats.impression_count
  )
  const content_quality_score = await calculateContentQualityScore(workId)
  const consistency_score = calculateConsistencyScore()
  
  // 重み付き総合スコア
  const overall_quality_score = 
    (ctr_score * 0.4) +                // CTRが最重要 40%
    (engagement_score * 0.3) +         // エンゲージメント 30%
    (content_quality_score * 0.2) +    // コンテンツ品質 20%
    (consistency_score * 0.1)          // 一貫性 10%
  
  return {
    ctr_score,
    engagement_score,
    content_quality_score,
    visual_score: content_quality_score, // 後方互換
    consistency_score,
    overall_quality_score: Math.round(overall_quality_score * 100) / 100
  }
}

/**
 * 複数作品の品質スコアをバッチ計算（キャッシュ対応）
 */
export async function batchCalculateQualityScores(
  workIds: string[]
): Promise<Record<string, QualityScoreComponents>> {
  const results: Record<string, QualityScoreComponents> = {}
  const uncachedWorkIds: string[] = []
  
  // キャッシュから取得可能な作品を先にチェック
  for (const workId of workIds) {
    try {
      const cachedScore = await getCachedQualityScore(workId)
      results[workId] = cachedScore
    } catch {
      uncachedWorkIds.push(workId)
    }
  }
  
  console.log(`⚡ [DEBUG] 品質スコア: キャッシュヒット ${workIds.length - uncachedWorkIds.length}件, 新規計算 ${uncachedWorkIds.length}件`)
  
  if (uncachedWorkIds.length === 0) {
    return results // 全てキャッシュから取得済み
  }
  
  // キャッシュにない作品のみ並列計算
  const promises = uncachedWorkIds.map(async (workId) => {
    const components = await calculateQualityScoreComponents(workId)
    return { workId, components }
  })
  
  const resolved = await Promise.allSettled(promises)
  
  resolved.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results[result.value.workId] = result.value.components
    } else {
      console.error(`品質スコア計算失敗 workId: ${uncachedWorkIds[index]}`, result.reason)
      // デフォルト値を設定
      results[uncachedWorkIds[index]] = {
        ctr_score: 0,
        engagement_score: 5,
        content_quality_score: 2,
        visual_score: 2, // 後方互換
        consistency_score: 5,
        overall_quality_score: 3.0
      }
    }
  })
  
  return results
}

/**
 * 個別作品の品質スコアキャッシュ（cookiesを使用しないバージョン）
 */
const getCachedQualityScore = unstable_cache(
  async (workId: string): Promise<QualityScoreComponents> => {
    console.log(`💾 [DEBUG] 品質スコア計算 (キャッシュ) - workId: ${workId}`)
    
    // cookiesを使用しない公開クライアントで作品情報を取得
    const supabase = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: work, error } = await supabase
      .from('works')
      .select('image_url, title, description, content')
      .eq('work_id', workId)
      .single()
    
    if (error || !work) {
      // デフォルト値を返す
      return {
        ctr_score: 0,
        engagement_score: 5,
        content_quality_score: 2,
        visual_score: 2,
        consistency_score: 5,
        overall_quality_score: 3.0
      }
    }
    
    // CTR統計を取得
    const ctrStats = await getWorkCTRStats([workId])
    const stats = ctrStats[0] || {
      ctr_unique: 0,
      avg_display_duration: 1000,
      avg_intersection_ratio: 0.5,
      impression_count: 0
    }
    
    // 各スコア要素を計算
    const ctr_score = calculateCTRScore(stats.ctr_unique)
    const engagement_score = calculateEngagementScore(
      stats.avg_display_duration,
      stats.avg_intersection_ratio,
      stats.impression_count
    )
    
    // コンテンツ品質スコアを直接計算
    let content_quality_score = 0
    
    // 本文の文章量評価 (最重要: 40%)
    const contentLength = work.content?.length || 0
    if (contentLength <= 10) {
      content_quality_score += 0.1 // 10文字以下は大幅減点
    } else if (contentLength >= 2000) {
      content_quality_score += 4 // 2000文字以上で満点
    } else if (contentLength >= 1000) {
      content_quality_score += 3 // 1000文字以上
    } else if (contentLength >= 500) {
      content_quality_score += 2 // 500文字以上
    } else if (contentLength >= 200) {
      content_quality_score += 1 // 200文字以上
    } else {
      content_quality_score += 0.5 // 200文字未満はペナルティ
    }
    
    // 画像有無 (30% - 重要度を下げた)
    if (work.image_url) {
      content_quality_score += 3 // 画像があれば3点（7点から減らした）
    } else {
      content_quality_score += 1 // なくても1点
    }
    
    // タイトルの質 (15%)
    if (work.title && work.title.length >= 10 && work.title.length <= 50) {
      content_quality_score += 1.5
    } else if (work.title && work.title.length > 0) {
      content_quality_score += 0.5
    }
    
    // 説明の質 (15%)
    if (work.description && work.description.length >= 20) {
      content_quality_score += 1.5
    } else if (work.description && work.description.length > 0) {
      content_quality_score += 0.5
    }
    
    content_quality_score = Math.min(10, content_quality_score)
    
    const consistency_score = 5 // 暫定的に中間値
    
    // 重み付き総合スコア
    const overall_quality_score = 
      (ctr_score * 0.4) +                // CTRが最重要 40%
      (engagement_score * 0.3) +         // エンゲージメント 30%
      (content_quality_score * 0.2) +    // コンテンツ品質 20%
      (consistency_score * 0.1)          // 一貫性 10%
    
    return {
      ctr_score,
      engagement_score,
      content_quality_score,
      visual_score: content_quality_score, // 後方互換
      consistency_score,
      overall_quality_score: Math.round(overall_quality_score * 100) / 100
    }
  },
  ['quality-score'],
  { revalidate: 3600 } // 1時間キャッシュ
)