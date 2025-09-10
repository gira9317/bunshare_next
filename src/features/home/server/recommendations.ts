'use server'

import { revalidateTag } from 'next/cache'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { 
  getUserBehaviorData, 
  getUserPreferences, 
  getFollowedAuthorsWorks, 
  getPopularWorks, 
  getQualityNewWorks,
  getChallengeWorks 
} from './loader'
import { batchCalculateQualityScores } from '@/features/analytics/server/ctr'
import { getUserReadingProgress } from '@/features/works/server/loader'
import type { RecommendationResult } from '../types'

/**
 * 読了率10%超えた作品を1日間除外する（最近読んだ作品の除外）
 */
async function filterRecentlyReadWorks(works: any[], userId: string): Promise<any[]> {
  try {
    // ユーザーの読書進捗を取得
    const readingProgress = await getUserReadingProgress(userId)
    
    // 読了率10%を超える作品IDを抽出
    const highProgressWorkIds = Object.keys(readingProgress).filter(workId => {
      const progress = readingProgress[workId]
      return progress > 10 // 10%超え
    })
    
    if (highProgressWorkIds.length === 0) {
      return works // 除外対象なし
    }
    
    console.log(`📚 [DEBUG] 読了率10%超え除外対象: ${highProgressWorkIds.length}件`)
    
    // 除外対象作品を除いた作品リストを返す
    const filteredWorks = works.filter(work => !highProgressWorkIds.includes(work.work_id))
    
    console.log(`🚫 [DEBUG] 最近読んだ作品除外: ${works.length} → ${filteredWorks.length}件`)
    
    return filteredWorks
  } catch (error) {
    console.error('❌ 最近読んだ作品除外エラー:', error)
    return works // エラー時は除外せずそのまま返す
  }
}

/**
 * ユーザー行動データ量に基づく推薦戦略を決定
 */
function determineStrategy(totalActions: number): 'personalized' | 'adaptive' | 'popular' {
  if (totalActions >= 50) {
    return 'personalized' // 高度個人化
  } else if (totalActions >= 10) {
    return 'adaptive' // 適応的
  } else {
    return 'popular' // 人気ベース
  }
}

/**
 * カテゴリ・タグベース作品推薦
 */
async function getCategoryTagBasedWorks(userId: string, limit = 15) {
  const supabase = await createClient()
  const preferences = await getUserPreferences(userId)
  
  if (!preferences.categories.length && !preferences.tags.length) {
    return []
  }

  const categories = preferences.categories.map(c => c.category)
  const tags = preferences.tags.map(t => t.tag)

  let query = supabase
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
    .neq('user_id', userId) // 自分の作品は除外

  // カテゴリまたはタグでフィルタリング
  if (categories.length > 0) {
    query = query.in('category', categories)
  }
  if (tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const { data: works, error } = await query
    .order('trend_score', { ascending: false })
    .order('likes_count', { ascending: false })
    .order('views_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('カテゴリベース作品取得エラー:', error)
    return []
  }

  if (!works?.length) {
    console.log('カテゴリベース作品が見つかりませんでした')
    return []
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

  console.log(`カテゴリベース作品 ${works.length} 件取得`)

  return works.map(work => ({
    ...work,
    author: userMap[work.user_id]?.username || '不明',
    author_username: userMap[work.user_id]?.username,
    // 統計カラムを直接利用
    views: work.views_count || 0,
    likes: work.likes_count || 0,
    comments: work.comments_count || 0
  }))
}

/**
 * ユーザー行動スコアを計算（0-10点）
 * スナップショット統計を使用して順序の安定化を図る
 */
function calculateUserBehaviorScore(work: any, userPreferences: any, followedAuthors: string[] = []): number {
  let score = 0
  
  // 基本エンゲージメント指標（統計カラム直接使用）
  // 事前計算済み統計カラムを利用して高速化
  const snapshotViews = work.snapshot_views ?? work.views_count ?? 0
  const snapshotLikes = work.snapshot_likes ?? work.likes_count ?? 0  
  const snapshotComments = work.snapshot_comments ?? work.comments_count ?? 0
  
  const normalizedViews = Math.min(10, snapshotViews / 1000) // 1000ビューで満点
  const normalizedLikes = Math.min(10, snapshotLikes / 100)  // 100いいねで満点  
  const normalizedComments = Math.min(10, snapshotComments / 20) // 20コメントで満点
  
  score += (normalizedViews * 0.3) + (normalizedLikes * 0.5) + (normalizedComments * 0.2)
  
  // カテゴリ・タグマッチング加点
  const userCategories = userPreferences.categories?.map((c: any) => c.category) || []
  const userTags = userPreferences.tags?.map((t: any) => t.tag) || []
  
  if (userCategories.includes(work.category)) {
    score += 2 // カテゴリマッチで2点加点
  }
  
  if (work.tags && userTags.some((tag: string) => work.tags.includes(tag))) {
    score += 1.5 // タグマッチで1.5点加点
  }
  
  // 新着作品への軽微なボーナス（鮮度）
  const createdDaysAgo = work.created_at ? 
    (Date.now() - new Date(work.created_at).getTime()) / (1000 * 60 * 60 * 24) : 999
  if (createdDaysAgo <= 7) {
    score += 1 // 1週間以内の新作に1点加点
  }
  
  // フォロー作家ボーナス
  const isFollowedAuthor = followedAuthors.includes(work.user_id)
  if (isFollowedAuthor) {
    score += 1 // フォロー作家の作品に1点加点
    work.is_followed_author = true
  }
  
  // デバッグ用フラグ設定
  work.is_category_match = userCategories.includes(work.category)
  work.is_tag_match = work.tags && userTags.some((tag: string) => work.tags.includes(tag))
  work.is_new_work = createdDaysAgo <= 7
  
  return Math.min(10, Math.max(0, score))
}

/**
 * 重複を除去し、品質スコア(0.3) + ユーザー行動スコア(0.7)でソート
 */
async function deduplicateAndSortWithQualityScore(works: any[], userId?: string) {
  console.log(`📊 [DEBUG] 品質スコア統合ソート開始 - 作品数: ${works.length}`)
  
  const seen = new Set()
  const unique = works.filter(work => {
    if (seen.has(work.work_id)) {
      return false
    }
    seen.add(work.work_id)
    return true
  })

  if (unique.length === 0) return []
  
  // ユーザー設定とフォロー情報を取得（行動スコア計算用）
  let userPreferences: any = { categories: [], tags: [] }
  let followedAuthors: string[] = []
  
  if (userId) {
    try {
      const supabase = await createClient()
      const [preferencesResult, followsResult] = await Promise.all([
        getUserPreferences(userId),
        supabase.from('follows').select('followed_id').eq('follower_id', userId)
      ])
      
      userPreferences = preferencesResult
      followedAuthors = followsResult.data?.map(f => f.followed_id) || []
      console.log(`👥 [DEBUG] フォロー作家数: ${followedAuthors.length}`)
    } catch (error) {
      console.warn('ユーザー設定・フォロー取得失敗:', error)
    }
  }

  // 品質スコアをバッチ計算
  const workIds = unique.map(work => work.work_id)
  let qualityScores: Record<string, any> = {}
  
  try {
    qualityScores = await batchCalculateQualityScores(workIds)
    console.log(`✅ [DEBUG] 品質スコア計算完了: ${Object.keys(qualityScores).length} 件`)
  } catch (error) {
    console.error('品質スコア計算エラー:', error)
    // フォールバック: 全作品に標準スコアを設定
    workIds.forEach(id => {
      qualityScores[id] = { overall_quality_score: 5.0 }
    })
  }

  // 各作品に総合スコアを計算して付与
  const scoredWorks = unique.map(work => {
    // スナップショット統計を固定化（推薦生成時点の値を保持）
    const workWithSnapshot = {
      ...work,
      snapshot_views: work.views_count,
      snapshot_likes: work.likes_count,
      snapshot_comments: work.comments_count
    }
    
    const qualityScore = qualityScores[work.work_id]?.overall_quality_score || 5.0
    const userBehaviorScore = calculateUserBehaviorScore(workWithSnapshot, userPreferences, followedAuthors)
    
    // 0.3 * 品質スコア + 0.7 * ユーザー行動スコア
    const totalScore = (qualityScore * 0.3) + (userBehaviorScore * 0.7)
    
    return {
      ...workWithSnapshot,
      quality_score: qualityScore,
      user_behavior_score: userBehaviorScore,
      recommendation_score: Math.round(totalScore * 100) / 100
    }
  })

  console.log(`📈 [DEBUG] スコア統合例:`, scoredWorks.slice(0, 3).map(w => ({
    title: w.title,
    quality: w.quality_score,
    behavior: w.user_behavior_score,
    total: w.recommendation_score
  })))

  // 総合スコア順でソート
  return scoredWorks.sort((a, b) => b.recommendation_score - a.recommendation_score)
}

/**
 * 軽量版重複除去（品質スコア計算なし）
 */
async function deduplicateWithoutQualityScore(works: any[], userId?: string): Promise<any[]> {
  console.log(`🚀 [DEBUG] 軽量版重複除去開始 - 作品数: ${works.length}`)
  
  const seen = new Set()
  const unique = works.filter(work => {
    if (seen.has(work.work_id)) {
      return false
    }
    seen.add(work.work_id)
    return true
  })

  // 統計カラムベースの簡単なソート（品質スコア計算スキップ）
  const sortedWorks = unique.sort((a, b) => {
    // trend_score > likes_count > views_count の優先順位
    if (a.trend_score !== b.trend_score) {
      return (b.trend_score || 0) - (a.trend_score || 0)
    }
    if (a.likes_count !== b.likes_count) {
      return (b.likes_count || 0) - (a.likes_count || 0)
    }
    return (b.views_count || 0) - (a.views_count || 0)
  })

  console.log(`✅ [DEBUG] 軽量版重複除去完了: ${sortedWorks.length} 件`)
  return sortedWorks
}

/**
 * 通常推薦にチャレンジ作品をステルス統合（5作品に1作品 = 20%）
 */
async function blendWithChallengeWorks(userId: string, regularWorks: any[], targetCount = 72): Promise<any[]> {
  console.log(`🎲 [DEBUG] チャレンジ統合開始 - 通常作品: ${regularWorks.length} 件`)
  
  // チャレンジ作品の挿入数を計算（20% = 5分の1）
  const challengeCount = Math.ceil(targetCount / 5) // 最低1作品、72作品なら15作品
  const regularCount = targetCount - challengeCount
  
  console.log(`🎯 [DEBUG] チャレンジ作品予定数: ${challengeCount} / ${targetCount}`)
  
  // ユーザーの嗜好を取得
  const preferences = await getUserPreferences(userId)
  const userCategories = preferences.categories.map(c => c.category)
  const userTags = preferences.tags.map(t => t.tag)
  
  // チャレンジ作品を取得
  const challengeWorks = await getChallengeWorks(userId, userCategories, userTags, challengeCount * 2) // 余裕をもって取得
  
  console.log(`🎲 [DEBUG] 取得チャレンジ作品: ${challengeWorks.length} 件`)
  
  if (challengeWorks.length === 0) {
    console.log(`⚠️ [DEBUG] チャレンジ作品なし、通常推薦のみ`)
    return regularWorks.slice(0, targetCount)
  }
  
  // 通常推薦から必要数を選択
  const selectedRegular = regularWorks.slice(0, regularCount)
  const selectedChallenge = challengeWorks.slice(0, challengeCount)
  
  // ランダムに混合（ただしチャレンジ作品が目立ちすぎないように調整）
  const blended = [...selectedRegular, ...selectedChallenge]
  
  // シャッフル（完全ランダムではなく、適度に分散）
  const result = []
  const regularPool = [...selectedRegular]
  const challengePool = [...selectedChallenge]
  
  for (let i = 0; i < targetCount && (regularPool.length > 0 || challengePool.length > 0); i++) {
    // 8作品に1作品の割合でチャレンジを配置
    const shouldInsertChallenge = (i + 1) % 8 === 0 && challengePool.length > 0
    
    if (shouldInsertChallenge) {
      result.push(challengePool.shift()!)
      console.log(`🎲 [DEBUG] 位置 ${i + 1} にチャレンジ作品挿入`)
    } else if (regularPool.length > 0) {
      result.push(regularPool.shift()!)
    } else if (challengePool.length > 0) {
      result.push(challengePool.shift()!)
    }
  }
  
  console.log(`✅ [DEBUG] 統合完了 - 通常: ${selectedRegular.length}, チャレンジ: ${selectedChallenge.length}`)
  return result
}

/**
 * 個人化推薦の実行（統合プール方式）
 */
async function executePersonalizedRecommendation(userId: string): Promise<any[]> {
  // 統合プールから大幅に多めに取得（段階的表示に対応）
  const [followedWorks, categoryWorks] = await Promise.all([
    getFollowedAuthorsWorks(userId, 30), // 大幅増加
    getCategoryTagBasedWorks(userId, 50) // 大幅増加
  ])

  // 統合プールで品質評価による競争
  return [...followedWorks, ...categoryWorks]
}

/**
 * 適応的推薦の実行（統合プール方式）
 */
async function executeAdaptiveRecommendation(userId: string): Promise<any[]> {
  // 個人化要素と人気要素を統合プールで競争（段階的表示に対応）
  const [followedWorks, categoryWorks, popularWorks] = await Promise.all([
    getFollowedAuthorsWorks(userId, 20), // 大幅増加
    getCategoryTagBasedWorks(userId, 30), // 大幅増加
    getPopularWorks(20) // 大幅増加
  ])

  return [...followedWorks, ...categoryWorks, ...popularWorks]
}

/**
 * 人気ベース推薦の実行（キャッシュされた関数を使用）
 */
async function executePopularRecommendation(): Promise<any[]> {
  // 人気作品と新着優良作品を組み合わせ（段階的表示に対応）
  const [popularWorks, newWorks] = await Promise.all([
    getPopularWorks(30), // 大幅増加
    getQualityNewWorks(20) // 大幅増加
  ])

  return [...popularWorks, ...newWorks]
}

/**
 * キャッシュされたゲスト向け推薦（認証不要）
 */
const getCachedGuestRecommendations = unstable_cache(
  async () => {
    const works = await executePopularRecommendation()
    const uniqueWorks = await deduplicateAndSortWithQualityScore(works) // ゲストはuserIdなし
    const limitedWorks = uniqueWorks.slice(0, 9) // 初期表示用に削減
    
    return {
      works: limitedWorks,
      strategy: 'popular' as const,
      source: '人気作品',
      total: limitedWorks.length
    }
  },
  ['guest-recommendations'],
  { revalidate: 1800 } // 30分キャッシュ
)


/**
 * メイン推薦関数
 */
export async function getRecommendationsAction(
  userId?: string, 
  excludeWorkIds?: string[], 
  targetCount = 9
): Promise<RecommendationResult | { error: string }> {
  console.log(`🚀 [DEBUG] 推薦機能開始 - userId: ${userId || 'ゲスト'}`)
  
  // ゲストユーザーの場合
  if (!userId) {
    console.log(`👤 [DEBUG] ゲストユーザー向け推薦`)
    try {
      const result = await getCachedGuestRecommendations()
      console.log(`✅ [DEBUG] ゲスト推薦完了 - ${result.works.length} 件`)
      return result
    } catch (error) {
      console.error('❌ ゲスト推薦エラー:', error)
      return { error: '推薦作品の取得に失敗しました' }
    }
  }

  // 認証ユーザーの場合（並行処理最適化版）
  try {
    console.log(`🔐 [DEBUG] 認証ユーザー向け推薦（並行処理最適化）`)
    
    // 1. ユーザー行動データ取得と推薦戦略決定を並行化
    const [behaviorData, readingProgressPromise] = await Promise.all([
      getUserBehaviorData(userId),
      filterRecentlyReadWorks([], userId) // 空配列で読書進捗のみ先行取得
    ])
    
    const totalActions = Object.values(behaviorData).reduce((sum, count) => sum + count, 0)
    const strategy = determineStrategy(totalActions)
    console.log(`📊 [DEBUG] 推薦戦略決定: ${strategy} (総行動数: ${totalActions})`)

    // 2. 推薦作品取得を並行実行
    let worksPromise: Promise<any[]>
    let source = ''

    switch (strategy) {
      case 'personalized':
        console.log(`🎯 [DEBUG] 個人化推薦実行`)
        worksPromise = executePersonalizedRecommendation(userId)
        source = 'あなたの好みから'
        break

      case 'adaptive':
        console.log(`🔄 [DEBUG] 適応的推薦実行`)
        worksPromise = executeAdaptiveRecommendation(userId)
        source = 'あなたの興味と人気作品から'
        break

      case 'popular':
      default:
        console.log(`🔥 [DEBUG] 人気ベース推薦実行`)
        worksPromise = executePopularRecommendation()
        source = '人気作品から'
        break
    }

    // 3. 作品取得と後処理を並行実行
    const [works] = await Promise.all([worksPromise])
    console.log(`📚 [DEBUG] 推薦作品収集完了: ${works.length} 件`)

    // 4. 最近読んだ作品の除外を並行処理済みデータで高速化
    const filteredWorks = await filterRecentlyReadWorks(works, userId)
    
    // 5. 重複除去とスコア計算を軽量化（品質スコア計算を条件分岐）
    const shouldCalculateQuality = works.length <= 100 // 作品数が少ない場合のみ品質計算
    const uniqueWorks = shouldCalculateQuality 
      ? await deduplicateAndSortWithQualityScore(filteredWorks, userId)
      : await deduplicateWithoutQualityScore(filteredWorks, userId) // 軽量版
    
    // 6. 除外処理
    let availableWorks = uniqueWorks
    if (excludeWorkIds && excludeWorkIds.length > 0) {
      availableWorks = uniqueWorks.filter(work => !excludeWorkIds.includes(work.work_id))
      console.log(`🚫 [DEBUG] 除外後: ${availableWorks.length} 件 (除外: ${excludeWorkIds.length}件)`)
    }
    
    const limitedWorks = availableWorks.slice(0, targetCount)
    console.log(`✂️ [DEBUG] 処理後: ${limitedWorks.length} 件`)
    
    // 7. チャレンジ作品統合（条件分岐で最適化）
    const finalWorks = targetCount > 9 
      ? await blendWithChallengeWorks(userId, limitedWorks, targetCount)
      : limitedWorks // 9作品以下の表示時はチャレンジ統合をスキップ
    
    console.log(`🎯 [DEBUG] 最終処理完了: ${finalWorks.length} 件`)
    
    const result = {
      works: finalWorks,
      strategy,
      source,
      total: finalWorks.length
    }
    
    console.log(`✅ [DEBUG] 推薦完了 - ${result.works.length} 件`)
    return result

  } catch (error) {
    console.error('推薦取得エラー:', error)
    return { error: '推薦作品の取得に失敗しました' }
  }
}