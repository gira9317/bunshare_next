import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { Work } from '@/features/works/types'

export interface PostCreationData {
  series: Array<{
    series_id: string
    title: string
    description: string | null
    cover_image_url: string | null
  }>
  drafts: Work[]
}

/**
 * 投稿作成画面に必要なデータを一括取得
 * シリーズと下書きを並列で取得し、パフォーマンスを最適化
 */
export const getPostCreationData = cache(async (userId: string, username?: string): Promise<PostCreationData> => {
  const startTime = Date.now()
  const supabase = await createClient()
  
  console.log(`[LOADER] getPostCreationData開始 - userId: ${userId}`)
  
  // 並列でシリーズと下書きを取得
  const parallelStartTime = Date.now()
  const [seriesResult, draftsResult] = await Promise.all([
    // ユーザーの既存シリーズを取得
    supabase
      .from('series')
      .select('id, title, description, cover_image_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    
    // ユーザーの下書き一覧を取得
    supabase
      .from('works')
      .select(`
        work_id,
        user_id,
        title,
        description,
        content,
        category,
        tags,
        image_url,
        series_id,
        episode_number,
        is_adult_content,
        created_at,
        updated_at,
        views_count,
        likes_count,
        comments_count,
        trend_score
      `)
      .eq('user_id', userId)
      .eq('is_published', false)
      .order('updated_at', { ascending: false })
  ])
  
  const parallelEndTime = Date.now()
  console.log(`[LOADER] 並列クエリ完了: ${parallelEndTime - parallelStartTime}ms`)
  console.log(`[LOADER] - シリーズ数: ${seriesResult.data?.length || 0}`)
  console.log(`[LOADER] - 下書き数: ${draftsResult.data?.length || 0}`)

  // エラーハンドリング
  if (seriesResult.error) {
    console.error('Error fetching user series:', seriesResult.error)
  }
  
  if (draftsResult.error) {
    console.error('Error fetching user drafts:', draftsResult.error)
  }

  // 作者情報を取得（usernameが渡されていればそれを使用）
  let author = username || 'Unknown'
  
  if (!username) {
    const userStartTime = Date.now()
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single()
    
    const userEndTime = Date.now()
    console.log(`[LOADER] ユーザー情報取得: ${userEndTime - userStartTime}ms`)
    author = user?.username || 'Unknown'
  } else {
    console.log(`[LOADER] ユーザー情報スキップ（既存データ使用）: ${username}`)
  }

  // シリーズデータの整形
  const series = (seriesResult.data || []).map(s => ({
    series_id: s.id,
    title: s.title,
    description: s.description,
    cover_image_url: s.cover_image_url
  }))

  // 下書きデータの整形
  const drafts = (draftsResult.data || []).map(work => ({
    ...work,
    author,
    author_username: author,
    views: work.views_count || 0,
    likes: work.likes_count || 0,
    comments: work.comments_count || 0
  })) as Work[]

  const totalTime = Date.now() - startTime
  console.log(`[LOADER] getPostCreationData完了: 総処理時間 ${totalTime}ms`)

  return {
    series,
    drafts
  }
})