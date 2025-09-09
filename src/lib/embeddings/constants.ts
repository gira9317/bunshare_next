// OpenAI text-embedding-3-small の定数
export const EMBEDDING_CONFIG = {
  MODEL_NAME: 'text-embedding-3-small',
  DIMENSIONS: 1536,
  MAX_TOKENS_PER_REQUEST: 8191,
  COST_PER_1M_TOKENS: 0.02, // $0.02 per 1M tokens
  
  // チャンク分割設定
  CHUNK_SIZE: 1000, // トークン数
  CHUNK_OVERLAP: 200, // オーバーラップトークン数
  
  // 処理設定
  DEFAULT_BATCH_SIZE: 20,
  MAX_BATCH_SIZE: 50,
  DEFAULT_MAX_COST_USD: 10.0,
  
  // セパレーター（日本語対応）
  SEPARATORS: ['\n\n', '\n', '。', '！', '？', '、', ' ', ''],
  
  // ステータス
  PROCESSING_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
  } as const,
  
  PROCESSING_TYPES: {
    TITLE: 'title',
    DESCRIPTION: 'description',
    TAGS: 'tags',
    CONTENT_CHUNK: 'content_chunk'
  } as const,
  
  LOG_STATUS: {
    STARTED: 'started',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
  } as const
} as const

// エラーコード
export const EMBEDDING_ERROR_CODES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  API_KEY_INVALID: 'API_KEY_INVALID',
  CONTENT_TOO_LONG: 'CONTENT_TOO_LONG',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  COST_LIMIT_EXCEEDED: 'COST_LIMIT_EXCEEDED',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT'
} as const

// レート制限設定
export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 3000, // OpenAI の制限に基づく
  TOKENS_PER_MINUTE: 1000000,
  REQUESTS_PER_DAY: 10000,
  
  // バックオフ設定
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 32000,
  MAX_RETRIES: 5
} as const

export type ProcessingStatus = typeof EMBEDDING_CONFIG.PROCESSING_STATUS[keyof typeof EMBEDDING_CONFIG.PROCESSING_STATUS]
export type ProcessingType = typeof EMBEDDING_CONFIG.PROCESSING_TYPES[keyof typeof EMBEDDING_CONFIG.PROCESSING_TYPES]
export type LogStatus = typeof EMBEDDING_CONFIG.LOG_STATUS[keyof typeof EMBEDDING_CONFIG.LOG_STATUS]
export type EmbeddingErrorCode = typeof EMBEDDING_ERROR_CODES[keyof typeof EMBEDDING_ERROR_CODES]