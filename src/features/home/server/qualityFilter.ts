'use server'

import { createClient as createPublicClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { getWorkCTRStats } from '../../analytics/server/ctr'
import type { CTRStats } from '../../analytics/server/ctr'

interface QualityWorkResult {
  work_id: string
  title: string
  description: string | null
  image_url: string | null
  category: string
  tags: string[]
  created_at: string
  updated_at: string
  user_id: string
  series_id: string | null
  episode_number: number | null
  is_published: boolean
  views: number
  likes: number
  comments: number
  author: string
  author_username?: string
  quality_score?: number
  ctr_stats?: CTRStats
}

/**
 * 新作専用品質スコア計算
 */
function calculateNewWorkQualityScore(
  work: any,
  ctrStats?: CTRStats
): number {
  let score = 0
  
  // CTRデータがある場合（60%重み）
  if (ctrStats && ctrStats.impression_count >= 20) {
    // CTRスコア (40%)
    const ctrScore = Math.min(10, (ctrStats.ctr_unique * 100) * 2) // 5%CTRで10点
    score += ctrScore * 0.4
    
    // エンゲージメントスコア (20%)
    const engagementScore = Math.min(10, 
      (ctrStats.avg_display_duration / 1000) + 
      (ctrStats.avg_intersection_ratio * 5)
    )
    score += engagementScore * 0.2
  }
  
  // 基本統計スコア（CTRデータない場合は100%、ある場合は40%）
  const hasReliableCTR = ctrStats && ctrStats.impression_count >= 20
  const basicWeight = hasReliableCTR ? 0.4 : 1.0
  
  // ビュー数正規化（新作なので閾値を低く）
  const viewsScore = Math.min(10, (work.views || 0) / 50) // 50ビューで満点
  // いいね数正規化
  const likesScore = Math.min(10, (work.likes || 0) / 10) // 10いいねで満点
  // コメント数正規化
  const commentsScore = Math.min(10, (work.comments || 0) / 3) // 3コメントで満点
  
  const basicScore = (viewsScore * 0.5) + (likesScore * 0.3) + (commentsScore * 0.2)
  score += basicScore * basicWeight
  
  return Math.min(10, Math.max(0, score))
}

/**
 * インプレッション閾値による段階的フィルタリング
 */
async function filterByImpressionThreshold(
  works: any[],
  minImpressions = 20
): Promise<{
  withCTR: QualityWorkResult[]
  withoutCTR: QualityWorkResult[]
}> {
  if (works.length === 0) {
    return { withCTR: [], withoutCTR: [] }
  }

  // CTR統計を取得
  const workIds = works.map(w => w.work_id)
  const ctrStats = await getWorkCTRStats(workIds)
  const ctrMap = ctrStats.reduce((acc, stat) => {
    acc[stat.work_id] = stat
    return acc
  }, {} as Record<string, CTRStats>)

  const withCTR: QualityWorkResult[] = []
  const withoutCTR: QualityWorkResult[] = []

  works.forEach(work => {
    const stats = ctrMap[work.work_id]
    const qualityScore = calculateNewWorkQualityScore(work, stats)
    
    const enrichedWork: QualityWorkResult = {
      ...work,
      quality_score: qualityScore,
      ctr_stats: stats
    }

    if (stats && stats.impression_count >= minImpressions) {
      withCTR.push(enrichedWork)
    } else {
      withoutCTR.push(enrichedWork)
    }
  })

  return { withCTR, withoutCTR }
}

/**
 * CTRを考慮した新作品質フィルタリングのメイン関数
 */
export const getQualityNewWorksWithCTR = unstable_cache(
  async (limit = 10, days = 14) => {
    const supabase = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - days)

    // 新作を幅広く取得（後でフィルタリング）
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
        views,
        likes,
        comments
      `)
      .eq('is_published', true)
      .gte('created_at', targetDate.toISOString())
      .gt('views', 1) // 最低限のビュー数
      .order('created_at', { ascending: false })
      .limit(limit * 3) // 余裕をもって取得

    if (error) {
      console.error('新作取得エラー:', error)
      return []
    }

    if (!works?.length) {
      return []
    }

    // ユーザー情報を取得
    const userIds = Array.from(new Set(works.map(work => work.user_id).filter(Boolean)))
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds)

    const userMap = users?.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as { [key: string]: any }) || {}

    // 作品にユーザー情報を付与
    const worksWithAuthors = works.map(work => ({
      ...work,
      author: userMap[work.user_id]?.username || '不明',
      author_username: userMap[work.user_id]?.username
    }))

    // 段階的フィルタリングを実行
    const { withCTR, withoutCTR } = await filterByImpressionThreshold(worksWithAuthors)

    // CTRデータ有りを優先してソート
    const sortedWithCTR = withCTR.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
    const sortedWithoutCTR = withoutCTR.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))

    // 混合して最終結果を作成（CTR有りを優先しつつバランスを保つ）
    const result: QualityWorkResult[] = []
    const ctrLimit = Math.ceil(limit * 0.7) // 70%はCTRデータ有り
    const basicLimit = limit - Math.min(ctrLimit, sortedWithCTR.length)

    result.push(...sortedWithCTR.slice(0, ctrLimit))
    result.push(...sortedWithoutCTR.slice(0, basicLimit))

    return result.slice(0, limit)
  },
  ['quality-new-works-ctr'],
  { revalidate: 1800 } // 30分キャッシュ
)