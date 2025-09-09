import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { WorkEmbeddingV2, WorkContentChunkV2, WorkEmbeddingStatus } from '../types'

export const getWorkEmbeddingById = cache(async (workId: string): Promise<WorkEmbeddingV2 | null> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('work_embeddings_v2')
    .select('*')
    .eq('work_id', workId)
    .single()

  if (error || !data) {
    return null
  }

  return data as WorkEmbeddingV2
})

export const getWorkContentChunks = cache(async (workId: string): Promise<WorkContentChunkV2[]> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('work_content_chunks_v2')
    .select('*')
    .eq('work_id', workId)
    .order('chunk_index', { ascending: true })

  if (error || !data) {
    return []
  }

  return data as WorkContentChunkV2[]
})

export const getEmbeddingProcessingStatus = cache(async (workId: string): Promise<WorkEmbeddingStatus> => {
  const supabase = await createClient()
  
  // 埋め込みデータの取得
  const { data: embedding } = await supabase
    .from('work_embeddings_v2')
    .select('processing_status, last_processed_at, tokens_used, api_cost_usd')
    .eq('work_id', workId)
    .single()

  // チャンク数の取得
  const { count: chunksCount } = await supabase
    .from('work_content_chunks_v2')
    .select('*', { count: 'exact', head: true })
    .eq('work_id', workId)

  // 最新のエラーメッセージを取得
  const { data: latestLog } = await supabase
    .from('embedding_processing_logs_v2')
    .select('error_message')
    .eq('work_id', workId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    work_id: workId,
    processing_status: embedding?.processing_status || 'pending',
    last_processed_at: embedding?.last_processed_at || null,
    tokens_used: embedding?.tokens_used || 0,
    api_cost_usd: embedding?.api_cost_usd || 0,
    chunks_count: chunksCount || 0,
    error_message: latestLog?.error_message || null
  }
})

export const getPendingWorksForProcessing = cache(async (limit: number = 20): Promise<string[]> => {
  const supabase = await createClient()
  
  // 未処理または失敗した作品を取得
  const { data: pendingEmbeddings } = await supabase
    .from('work_embeddings_v2')
    .select('work_id')
    .in('processing_status', ['pending', 'failed'])
    .order('updated_at', { ascending: true })
    .limit(limit)

  const pendingWorkIds = pendingEmbeddings?.map(e => e.work_id) || []

  // 埋め込みテーブルにないが、公開済みの作品も取得
  const { data: publishedWorks } = await supabase
    .from('works')
    .select('work_id')
    .eq('is_published', true)
    .not('work_id', 'in', `(${pendingWorkIds.map(id => `'${id}'`).join(',') || 'null'})`)
    .order('created_at', { ascending: false })
    .limit(Math.max(0, limit - pendingWorkIds.length))

  const newWorkIds = publishedWorks?.map(w => w.work_id) || []

  return [...pendingWorkIds, ...newWorkIds].slice(0, limit)
})

export const getRecentlyUpdatedWorks = cache(async (limit: number = 20): Promise<string[]> => {
  const supabase = await createClient()
  
  // 最近更新された公開済み作品を取得
  const { data: updatedWorks } = await supabase
    .from('works')
    .select('work_id, updated_at')
    .eq('is_published', true)
    .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24時間以内
    .order('updated_at', { ascending: false })
    .limit(limit)

  return updatedWorks?.map(w => w.work_id) || []
})

export const getDailyCostSummary = cache(async (days: number = 30) => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('embedding_cost_tracking')
    .select('date, total_tokens_used, total_api_calls, total_cost_usd')
    .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error || !data) {
    return []
  }

  return data
})

export const getTotalCostThisMonth = cache(async (): Promise<number> => {
  const supabase = await createClient()
  
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  
  const { data } = await supabase
    .from('embedding_cost_tracking')
    .select('total_cost_usd')
    .gte('date', `${currentMonth}-01`)
    .lt('date', new Date(new Date(`${currentMonth}-01`).setMonth(new Date(`${currentMonth}-01`).getMonth() + 1)).toISOString().slice(0, 10))

  const totalCost = data?.reduce((sum, record) => sum + Number(record.total_cost_usd), 0) || 0
  return totalCost
})