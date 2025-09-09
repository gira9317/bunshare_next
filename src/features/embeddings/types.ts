export interface WorkEmbeddingV2 {
  id: string
  work_id: string
  title_hash?: string
  content_hash?: string
  tags_hash?: string
  title_embedding?: number[]
  description_embedding?: number[]
  tags_embedding?: number[]
  embedding_model: string
  embedding_version: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  tokens_used: number
  api_cost_usd: number
  processing_time_ms?: number
  created_at: string
  updated_at: string
  last_processed_at?: string
}

export interface WorkContentChunkV2 {
  id: string
  work_id: string
  chunk_index: number
  chunk_text: string
  chunk_embedding?: number[]
  token_count: number
  chunk_hash: string
  created_at: string
  updated_at: string
}

export interface EmbeddingProcessingLogV2 {
  id: string
  work_id: string
  batch_id?: string
  processing_type: 'title' | 'description' | 'tags' | 'content_chunk'
  chunk_index?: number
  status: 'started' | 'completed' | 'failed' | 'skipped'
  error_message?: string
  error_code?: string
  processing_time_ms?: number
  tokens_used?: number
  api_cost_usd?: number
  created_at: string
}

export interface EmbeddingCostTracking {
  id: string
  date: string
  total_tokens_used: number
  total_api_calls: number
  total_cost_usd: number
  model_name: string
  created_at: string
  updated_at: string
}

export interface EmbeddingProcessingRequest {
  work_ids?: string[]
  force_reprocess?: boolean
  max_cost_usd?: number
  batch_size?: number
}

export interface EmbeddingProcessingResponse {
  batch_id: string
  processed_works: number
  skipped_works: number
  failed_works: number
  total_tokens_used: number
  total_cost_usd: number
  processing_time_ms: number
}

export interface WorkEmbeddingStatus {
  work_id: string
  processing_status: string
  last_processed_at?: string
  tokens_used: number
  api_cost_usd: number
  chunks_count: number
  error_message?: string
}

export interface ChunkProcessingResult {
  chunk_index: number
  success: boolean
  tokens_used: number
  processing_time_ms: number
  error?: string
}