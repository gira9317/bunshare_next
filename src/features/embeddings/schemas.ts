import { z } from 'zod'

export const WorkEmbeddingV2Schema = z.object({
  id: z.string().uuid(),
  work_id: z.string().uuid(),
  title_hash: z.string().nullable(),
  content_hash: z.string().nullable(),
  tags_hash: z.string().nullable(),
  title_embedding: z.array(z.number()).nullable(),
  description_embedding: z.array(z.number()).nullable(),
  tags_embedding: z.array(z.number()).nullable(),
  embedding_model: z.string().default('text-embedding-3-small'),
  embedding_version: z.number().int().default(1),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed', 'skipped']),
  tokens_used: z.number().int().min(0).default(0),
  api_cost_usd: z.number().min(0).default(0),
  processing_time_ms: z.number().int().min(0).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  last_processed_at: z.string().nullable()
})

export const WorkContentChunkV2Schema = z.object({
  id: z.string().uuid(),
  work_id: z.string().uuid(),
  chunk_index: z.number().int().min(0),
  chunk_text: z.string().min(1),
  chunk_embedding: z.array(z.number()).length(1536).nullable(),
  token_count: z.number().int().min(1).max(8191),
  chunk_hash: z.string(),
  created_at: z.string(),
  updated_at: z.string()
})

export const EmbeddingProcessingRequestSchema = z.object({
  work_ids: z.array(z.string().uuid()).optional(),
  force_reprocess: z.boolean().default(false),
  max_cost_usd: z.number().min(0).max(100).default(10),
  batch_size: z.number().int().min(1).max(50).default(20)
})

export const EmbeddingProcessingLogV2Schema = z.object({
  id: z.string().uuid(),
  work_id: z.string().uuid(),
  batch_id: z.string().uuid().nullable(),
  processing_type: z.enum(['title', 'description', 'tags', 'content_chunk']),
  chunk_index: z.number().int().min(0).nullable(),
  status: z.enum(['started', 'completed', 'failed', 'skipped']),
  error_message: z.string().nullable(),
  error_code: z.string().nullable(),
  processing_time_ms: z.number().int().min(0).nullable(),
  tokens_used: z.number().int().min(0).nullable(),
  api_cost_usd: z.number().min(0).nullable(),
  created_at: z.string()
})

export const EmbeddingCostTrackingSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  total_tokens_used: z.number().int().min(0),
  total_api_calls: z.number().int().min(0),
  total_cost_usd: z.number().min(0),
  model_name: z.string().default('text-embedding-3-small'),
  created_at: z.string(),
  updated_at: z.string()
})

// Edge Function用のリクエスト/レスポンススキーマ
export const BatchProcessingRequestSchema = z.object({
  batch_size: z.number().int().min(1).max(50).default(20),
  max_cost_usd: z.number().min(0).max(100).default(10.0),
  force_reprocess: z.boolean().default(false),
  work_ids: z.array(z.string().uuid()).optional()
})

export const BatchProcessingResponseSchema = z.object({
  batch_id: z.string().uuid(),
  processed_works: z.number().int().min(0),
  skipped_works: z.number().int().min(0),
  failed_works: z.number().int().min(0),
  total_tokens_used: z.number().int().min(0),
  total_cost_usd: z.number().min(0),
  processing_time_ms: z.number().int().min(0)
})

export const WorkEmbeddingStatusSchema = z.object({
  work_id: z.string().uuid(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed', 'skipped']),
  last_processed_at: z.string().nullable(),
  tokens_used: z.number().int().min(0),
  api_cost_usd: z.number().min(0),
  chunks_count: z.number().int().min(0),
  error_message: z.string().nullable()
})

export type WorkEmbeddingV2Input = z.infer<typeof WorkEmbeddingV2Schema>
export type WorkContentChunkV2Input = z.infer<typeof WorkContentChunkV2Schema>
export type EmbeddingProcessingRequestInput = z.infer<typeof EmbeddingProcessingRequestSchema>
export type EmbeddingProcessingLogV2Input = z.infer<typeof EmbeddingProcessingLogV2Schema>
export type EmbeddingCostTrackingInput = z.infer<typeof EmbeddingCostTrackingSchema>
export type BatchProcessingRequestInput = z.infer<typeof BatchProcessingRequestSchema>
export type BatchProcessingResponseInput = z.infer<typeof BatchProcessingResponseSchema>
export type WorkEmbeddingStatusInput = z.infer<typeof WorkEmbeddingStatusSchema>