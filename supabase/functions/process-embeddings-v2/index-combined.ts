import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts'

// ====== UTILITY FUNCTIONS ======

// hasher.ts utilities
function generateContentHash(content: string): string {
  if (!content || content.trim() === '') {
    return ''
  }
  
  const encoder = new TextEncoder()
  const data = encoder.encode(content.trim())
  
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data[i]
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit整数に変換
  }
  return Math.abs(hash).toString(16)
}

function generateWorkHashes(work: {
  title?: string | null
  content?: string | null
  tags?: string[] | null
  description?: string | null
}) {
  const titleHash = generateContentHash(work.title || '')
  const contentHash = generateContentHash(work.content || '')
  const descriptionHash = generateContentHash(work.description || '')
  const tagsHash = generateContentHash(JSON.stringify(work.tags || []))
  
  return {
    titleHash,
    contentHash,
    descriptionHash,
    tagsHash
  }
}

function generateChunkHash(chunkText: string, chunkIndex: number): string {
  const content = `${chunkIndex}:${chunkText.trim()}`
  return generateContentHash(content)
}

function hasContentChanged(
  currentHashes: {
    titleHash: string
    contentHash: string
    descriptionHash: string
    tagsHash: string
  },
  existingHashes: {
    title_hash?: string | null
    content_hash?: string | null
    description_hash?: string | null
    tags_hash?: string | null
  }
): {
  hasChanged: boolean
  changedFields: string[]
} {
  const changedFields: string[] = []
  
  if (currentHashes.titleHash !== (existingHashes.title_hash || '')) {
    changedFields.push('title')
  }
  
  if (currentHashes.contentHash !== (existingHashes.content_hash || '')) {
    changedFields.push('content')
  }
  
  if (currentHashes.descriptionHash !== (existingHashes.description_hash || '')) {
    changedFields.push('description')
  }
  
  if (currentHashes.tagsHash !== (existingHashes.tags_hash || '')) {
    changedFields.push('tags')
  }
  
  return {
    hasChanged: changedFields.length > 0,
    changedFields
  }
}

function detectChunkChanges(
  newChunks: { text: string; index: number }[],
  existingChunks: { chunk_hash: string; chunk_index: number }[]
): {
  hasChanged: boolean
  changedChunks: number[]
  newChunksCount: number
  removedChunksCount: number
} {
  const newHashes = newChunks.map(chunk => ({
    index: chunk.index,
    hash: generateChunkHash(chunk.text, chunk.index)
  }))
  
  const existingHashMap = new Map(
    existingChunks.map(chunk => [chunk.chunk_index, chunk.chunk_hash])
  )
  
  const changedChunks: number[] = []
  
  for (const newHash of newHashes) {
    const existingHash = existingHashMap.get(newHash.index)
    if (!existingHash || existingHash !== newHash.hash) {
      changedChunks.push(newHash.index)
    }
  }
  
  const newChunksCount = Math.max(0, newChunks.length - existingChunks.length)
  const removedChunksCount = Math.max(0, existingChunks.length - newChunks.length)
  
  return {
    hasChanged: changedChunks.length > 0 || newChunksCount > 0 || removedChunksCount > 0,
    changedChunks,
    newChunksCount,
    removedChunksCount
  }
}

// cost-calculator.ts utilities
function calculateEmbeddingCost(tokens: number): number {
  const costPerToken = 0.02 / 1_000_000
  return Math.round(tokens * costPerToken * 1_000_000) / 1_000_000
}

// chunker.ts utilities
const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200
const SEPARATORS = ['\\n\\n', '\\n', '。', '！', '？', '、', ' ', '']

function estimateTokens(text: string): number {
  const japaneseChars = (text.match(/[\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FAF]/g) || []).length
  const otherChars = text.length - japaneseChars
  return Math.ceil(japaneseChars * 1.5 + otherChars * 0.25)
}

function splitText(text: string, separators: string[]): string[] {
  if (separators.length === 0) {
    return [text]
  }

  const [separator, ...remainingSeparators] = separators
  const parts = text.split(separator)

  if (parts.length === 1) {
    return splitText(text, remainingSeparators)
  }

  const result: string[] = []
  for (const part of parts) {
    if (estimateTokens(part) > CHUNK_SIZE && remainingSeparators.length > 0) {
      result.push(...splitText(part, remainingSeparators))
    } else {
      result.push(part)
    }
  }

  return result.filter(chunk => chunk.trim().length > 0)
}

function forceChunkSplit(text: string, maxTokens: number): string[] {
  const estimatedTokensPerChar = estimateTokens(text) / text.length
  const maxChars = Math.floor(maxTokens / estimatedTokensPerChar)
  
  const result: string[] = []
  for (let i = 0; i < text.length; i += maxChars) {
    const chunk = text.slice(i, i + maxChars)
    result.push(chunk)
  }
  
  return result
}

function mergeChunks(chunks: string[]): string[] {
  if (chunks.length === 0) return []

  const result: string[] = []
  let currentChunk = ''
  let currentTokens = 0

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk)
    
    if (chunkTokens > CHUNK_SIZE) {
      if (currentChunk) {
        result.push(currentChunk.trim())
        currentChunk = ''
        currentTokens = 0
      }
      
      const forceSplit = forceChunkSplit(chunk, CHUNK_SIZE)
      result.push(...forceSplit)
      continue
    }

    if (currentTokens + chunkTokens <= CHUNK_SIZE) {
      currentChunk += (currentChunk ? '\\n' : '') + chunk
      currentTokens += chunkTokens
    } else {
      if (currentChunk) {
        result.push(currentChunk.trim())
      }
      currentChunk = chunk
      currentTokens = chunkTokens
    }
  }

  if (currentChunk) {
    result.push(currentChunk.trim())
  }

  return result
}

function getOverlapText(text: string, maxTokens: number): string {
  const sentences = text.split(/[。！？]/);
  let overlapText = ''
  let tokenCount = 0
  
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i]
    const sentenceTokens = estimateTokens(sentence)
    
    if (tokenCount + sentenceTokens <= maxTokens) {
      overlapText = sentence + overlapText
      tokenCount += sentenceTokens
    } else {
      break
    }
  }
  
  return overlapText.trim()
}

function addOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks

  const result: string[] = []
  
  for (let i = 0; i < chunks.length; i++) {
    let chunkWithOverlap = chunks[i]
    
    if (i > 0) {
      const prevChunk = chunks[i - 1]
      const overlapText = getOverlapText(prevChunk, CHUNK_OVERLAP)
      if (overlapText) {
        chunkWithOverlap = overlapText + '\\n' + chunkWithOverlap
      }
    }
    
    result.push(chunkWithOverlap)
  }
  
  return result
}

function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  if (estimateTokens(text) <= CHUNK_SIZE) {
    return [text.trim()]
  }

  console.log(`Chunking text: ${text.length} characters, estimated ${estimateTokens(text)} tokens`)

  const initialChunks = splitText(text, SEPARATORS)
  console.log(`Initial split: ${initialChunks.length} chunks`)

  const mergedChunks = mergeChunks(initialChunks)
  console.log(`After merging: ${mergedChunks.length} chunks`)

  const finalChunks = addOverlap(mergedChunks)
  console.log(`Final chunks: ${finalChunks.length}`)

  finalChunks.forEach((chunk, index) => {
    const tokens = estimateTokens(chunk)
    if (tokens > CHUNK_SIZE * 1.2) {
      console.warn(`Chunk ${index} is oversized: ${tokens} tokens`)
    }
  })

  return finalChunks
}

// ====== MAIN EDGE FUNCTION ======

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

    // 認証チェックをスキップ（pg_netからの内部呼び出しのため）
    console.log('Processing embeddings request')

    const requestBody: ProcessingRequest = await req.json()
    const batchId = crypto.randomUUID()
    const startTime = Date.now()

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
      const { data: pendingWorks } = await supabase
        .from('work_embeddings_v2')
        .select('work_id')
        .in('processing_status', ['pending', 'failed'])
        .order('updated_at', { ascending: true })
        .limit(batchSize)

      const pendingWorkIds = pendingWorks?.map(w => w.work_id) || []

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

        const { data: existingEmbedding } = await supabase
          .from('work_embeddings_v2')
          .select('*')
          .eq('work_id', workId)
          .single()

        const currentHashes = generateWorkHashes(work)
        const changeCheck = hasContentChanged(currentHashes, existingEmbedding || {})

        if (!forceReprocess && existingEmbedding && !changeCheck.hasChanged) {
          console.log(`[${batchId}] No changes detected for work: ${workId}`)
          skippedWorks++
          continue
        }

        await logProcessingStart(batchId, workId, 'title')

        const workTokensUsed = await processWorkEmbeddings(batchId, work, existingEmbedding, currentHashes, changeCheck.changedFields)
        
        totalTokensUsed += workTokensUsed
        totalCostUsd += calculateEmbeddingCost(workTokensUsed)
        processedWorks++

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

  const { data: existingChunks } = await supabase
    .from('work_content_chunks_v2')
    .select('chunk_index, chunk_hash')
    .eq('work_id', workId)
    .order('chunk_index')

  const changeDetection = detectChunkChanges(
    chunks.map((chunk, index) => ({ text: chunk, index })),
    existingChunks || []
  )

  if (!changeDetection.hasChanged) {
    console.log(`No chunk changes detected for work ${workId}`)
    return 0
  }

  if (changeDetection.removedChunksCount > 0) {
    await supabase
      .from('work_content_chunks_v2')
      .delete()
      .eq('work_id', workId)
      .gte('chunk_index', chunks.length)
  }

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
      processing_type: 'title',
      status: 'failed',
      error_message: error.message || error.toString(),
      error_code: error.code || 'UNKNOWN_ERROR'
    })
}