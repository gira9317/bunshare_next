import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'
import { generateContentHash, generateWorkHashes, hasContentChanged, detectChunkChanges, generateChunkHash } from './hasher.ts'
import { chunkText } from './chunker.ts'
import { calculateEmbeddingCost } from './cost-calculator.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
})

interface ProcessingRequest {
  work_ids?: string[]
  force_reprocess?: boolean
  max_cost_usd?: number
  batch_size?: number
}

interface ProcessingResult {
  batch_id: string
  processed_works: number
  skipped_works: number
  failed_works: number
  total_tokens_used: number
  total_cost_usd: number
  processing_time_ms: number
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const requestBody: ProcessingRequest = await req.json()
    const batchId = crypto.randomUUID()
    const startTime = Date.now()

    // デフォルト値
    const batchSize = requestBody.batch_size || 20
    const maxCostUsd = requestBody.max_cost_usd || 10.0
    const forceReprocess = requestBody.force_reprocess || false

    console.log(`[${batchId}] Starting embedding processing batch`, {
      batchSize,
      maxCostUsd,
      forceReprocess,
      specifiedWorkIds: requestBody.work_ids?.length || 0
    })

    // 処理対象の作品を取得
    let workIds: string[] = []
    
    if (requestBody.work_ids && requestBody.work_ids.length > 0) {
      workIds = requestBody.work_ids.slice(0, batchSize)
    } else {
      // 未処理または失敗した作品を取得
      const { data: pendingWorks } = await supabase
        .from('work_embeddings_v2')
        .select('work_id')
        .in('processing_status', ['pending', 'failed'])
        .order('updated_at', { ascending: true })
        .limit(batchSize)

      const pendingWorkIds = pendingWorks?.map(w => w.work_id) || []

      // 埋め込みテーブルにない公開済み作品も取得
      if (pendingWorkIds.length < batchSize) {
        const remainingSlots = batchSize - pendingWorkIds.length
        const { data: newWorks } = await supabase
          .from('works')
          .select('work_id')
          .eq('is_published', true)
          .not('work_id', 'in', pendingWorkIds.length > 0 ? `(${pendingWorkIds.map(id => `'${id}'`).join(',')})` : '(null)')
          .order('created_at', { ascending: false })
          .limit(remainingSlots)

        const newWorkIds = newWorks?.map(w => w.work_id) || []
        workIds = [...pendingWorkIds, ...newWorkIds]
      } else {
        workIds = pendingWorkIds
      }
    }

    if (workIds.length === 0) {
      console.log(`[${batchId}] No works to process`)
      return new Response(JSON.stringify({
        batch_id: batchId,
        processed_works: 0,
        skipped_works: 0,
        failed_works: 0,
        total_tokens_used: 0,
        total_cost_usd: 0,
        processing_time_ms: Date.now() - startTime
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`[${batchId}] Processing ${workIds.length} works`)

    // 月間コスト制限をチェック
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: monthlyCosts } = await supabase
      .from('embedding_cost_tracking')
      .select('total_cost_usd')
      .gte('date', `${currentMonth}-01`)

    const currentMonthlyCost = monthlyCosts?.reduce((sum, record) => sum + Number(record.total_cost_usd), 0) || 0
    
    if (currentMonthlyCost >= maxCostUsd) {
      console.log(`[${batchId}] Monthly cost limit exceeded: $${currentMonthlyCost} >= $${maxCostUsd}`)
      return new Response(JSON.stringify({
        error: 'Monthly cost limit exceeded',
        current_cost: currentMonthlyCost,
        limit: maxCostUsd
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let processedWorks = 0
    let skippedWorks = 0
    let failedWorks = 0
    let totalTokensUsed = 0
    let totalCostUsd = 0

    // 各作品を処理
    for (const workId of workIds) {
      try {
        console.log(`[${batchId}] Processing work: ${workId}`)

        // 作品データを取得
        const { data: work } = await supabase
          .from('works')
          .select('work_id, title, content, description, tags')
          .eq('work_id', workId)
          .eq('is_published', true)
          .single()

        if (!work) {
          console.log(`[${batchId}] Work not found or not published: ${workId}`)
          skippedWorks++
          continue
        }

        // 既存の埋め込みデータを取得
        const { data: existingEmbedding } = await supabase
          .from('work_embeddings_v2')
          .select('*')
          .eq('work_id', workId)
          .single()

        // ハッシュを生成して差分チェック
        const currentHashes = generateWorkHashes(work)
        const changeCheck = hasContentChanged(currentHashes, existingEmbedding || {})

        if (!forceReprocess && existingEmbedding && !changeCheck.hasChanged) {
          console.log(`[${batchId}] No changes detected for work: ${workId}`)
          skippedWorks++
          continue
        }

        // 処理状況をログに記録
        await logProcessingStart(batchId, workId, 'title')

        const workTokensUsed = await processWorkEmbeddings(batchId, work, existingEmbedding, currentHashes, changeCheck.changedFields)
        
        totalTokensUsed += workTokensUsed
        totalCostUsd += calculateEmbeddingCost(workTokensUsed)
        processedWorks++

        // コスト制限チェック
        if (currentMonthlyCost + totalCostUsd >= maxCostUsd) {
          console.log(`[${batchId}] Stopping batch due to cost limit`)
          break
        }

      } catch (error) {
        console.error(`[${batchId}] Failed to process work ${workId}:`, error)
        await logProcessingError(batchId, workId, error)
        failedWorks++
      }
    }

    // 日別コスト追跡を更新
    if (totalTokensUsed > 0) {
      await supabase.rpc('update_daily_embedding_cost', {
        p_tokens_used: totalTokensUsed,
        p_api_calls: processedWorks,
        p_cost_usd: totalCostUsd
      })
    }

    const result: ProcessingResult = {
      batch_id: batchId,
      processed_works: processedWorks,
      skipped_works: skippedWorks,
      failed_works: failedWorks,
      total_tokens_used: totalTokensUsed,
      total_cost_usd: totalCostUsd,
      processing_time_ms: Date.now() - startTime
    }

    console.log(`[${batchId}] Batch processing completed`, result)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function processWorkEmbeddings(
  batchId: string,
  work: any,
  existingEmbedding: any,
  currentHashes: any,
  changedFields: string[]
): Promise<number> {
  let totalTokens = 0

  // 埋め込みレコードを作成または更新
  const { data: embeddingRecord } = await supabase
    .from('work_embeddings_v2')
    .upsert({
      work_id: work.work_id,
      title_hash: currentHashes.titleHash,
      content_hash: currentHashes.contentHash,
      tags_hash: currentHashes.tagsHash,
      processing_status: 'processing',
      last_processed_at: new Date().toISOString()
    })
    .select()
    .single()

  try {
    // タイトル埋め込み
    if (work.title && (changedFields.includes('title') || !existingEmbedding)) {
      const titleEmbedding = await generateEmbedding(work.title)
      totalTokens += estimateTokens(work.title)
      
      await supabase
        .from('work_embeddings_v2')
        .update({ title_embedding: titleEmbedding })
        .eq('work_id', work.work_id)

      await logProcessingComplete(batchId, work.work_id, 'title', estimateTokens(work.title))
    }

    // 説明埋め込み
    if (work.description && (changedFields.includes('description') || !existingEmbedding)) {
      const descEmbedding = await generateEmbedding(work.description)
      totalTokens += estimateTokens(work.description)
      
      await supabase
        .from('work_embeddings_v2')
        .update({ description_embedding: descEmbedding })
        .eq('work_id', work.work_id)

      await logProcessingComplete(batchId, work.work_id, 'description', estimateTokens(work.description))
    }

    // タグ埋め込み
    if (work.tags && work.tags.length > 0 && (changedFields.includes('tags') || !existingEmbedding)) {
      const tagsText = work.tags.join(' ')
      const tagsEmbedding = await generateEmbedding(tagsText)
      totalTokens += estimateTokens(tagsText)
      
      await supabase
        .from('work_embeddings_v2')
        .update({ tags_embedding: tagsEmbedding })
        .eq('work_id', work.work_id)

      await logProcessingComplete(batchId, work.work_id, 'tags', estimateTokens(tagsText))
    }

    // コンテンツチャンク処理
    if (work.content && (changedFields.includes('content') || !existingEmbedding)) {
      const chunkTokens = await processContentChunks(batchId, work.work_id, work.content)
      totalTokens += chunkTokens
    }

    // 処理完了をマーク
    await supabase
      .from('work_embeddings_v2')
      .update({
        processing_status: 'completed',
        tokens_used: totalTokens,
        api_cost_usd: calculateEmbeddingCost(totalTokens),
        last_processed_at: new Date().toISOString()
      })
      .eq('work_id', work.work_id)

    return totalTokens

  } catch (error) {
    // エラー時は failed ステータスに更新
    await supabase
      .from('work_embeddings_v2')
      .update({
        processing_status: 'failed',
        last_processed_at: new Date().toISOString()
      })
      .eq('work_id', work.work_id)

    throw error
  }
}

async function processContentChunks(batchId: string, workId: string, content: string): Promise<number> {
  const chunks = chunkText(content)
  let totalTokens = 0

  // 既存チャンクを取得
  const { data: existingChunks } = await supabase
    .from('work_content_chunks_v2')
    .select('chunk_index, chunk_hash')
    .eq('work_id', workId)
    .order('chunk_index')

  // 変更されたチャンクを検出
  const changeDetection = detectChunkChanges(
    chunks.map((chunk, index) => ({ text: chunk, index })),
    existingChunks || []
  )

  if (!changeDetection.hasChanged) {
    console.log(`No chunk changes detected for work ${workId}`)
    return 0
  }

  // 不要なチャンクを削除
  if (changeDetection.removedChunksCount > 0) {
    await supabase
      .from('work_content_chunks_v2')
      .delete()
      .eq('work_id', workId)
      .gte('chunk_index', chunks.length)
  }

  // 変更されたチャンクを処理
  for (const chunkIndex of changeDetection.changedChunks) {
    if (chunkIndex < chunks.length) {
      const chunkText = chunks[chunkIndex]
      const chunkHash = generateChunkHash(chunkText, chunkIndex)
      const chunkEmbedding = await generateEmbedding(chunkText)
      const tokenCount = estimateTokens(chunkText)

      await supabase
        .from('work_content_chunks_v2')
        .upsert({
          work_id: workId,
          chunk_index: chunkIndex,
          chunk_text: chunkText,
          chunk_embedding: chunkEmbedding,
          token_count: tokenCount,
          chunk_hash: chunkHash
        })

      await logProcessingComplete(batchId, workId, 'content_chunk', tokenCount, chunkIndex)
      totalTokens += tokenCount
    }
  }

  return totalTokens
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float'
  })

  return response.data[0].embedding
}

function estimateTokens(text: string): number {
  // 大まかなトークン数推定（実際はtiktokenライブラリを使用すべき）
  return Math.ceil(text.length / 3)
}

async function logProcessingStart(batchId: string, workId: string, processingType: string) {
  await supabase
    .from('embedding_processing_logs_v2')
    .insert({
      work_id: workId,
      batch_id: batchId,
      processing_type: processingType,
      status: 'started'
    })
}

async function logProcessingComplete(batchId: string, workId: string, processingType: string, tokensUsed: number, chunkIndex?: number) {
  await supabase
    .from('embedding_processing_logs_v2')
    .insert({
      work_id: workId,
      batch_id: batchId,
      processing_type: processingType,
      chunk_index: chunkIndex,
      status: 'completed',
      tokens_used: tokensUsed,
      api_cost_usd: calculateEmbeddingCost(tokensUsed)
    })
}

async function logProcessingError(batchId: string, workId: string, error: any) {
  await supabase
    .from('embedding_processing_logs_v2')
    .insert({
      work_id: workId,
      batch_id: batchId,
      processing_type: 'title', // デフォルト
      status: 'failed',
      error_message: error.message || error.toString(),
      error_code: error.code || 'UNKNOWN_ERROR'
    })
}