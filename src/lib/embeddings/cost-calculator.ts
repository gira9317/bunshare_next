import { EMBEDDING_CONFIG } from './constants'

/**
 * トークン数からコストを計算
 */
export function calculateEmbeddingCost(tokens: number): number {
  // text-embedding-3-small: $0.02 per 1M tokens
  const costPerToken = EMBEDDING_CONFIG.COST_PER_1M_TOKENS / 1_000_000
  return Math.round(tokens * costPerToken * 1_000_000) / 1_000_000 // 6桁で丸める
}

/**
 * 複数のAPIコールのコストを集計
 */
export function calculateTotalCost(apiCalls: { tokens: number }[]): {
  totalTokens: number
  totalCost: number
  averageTokensPerCall: number
} {
  const totalTokens = apiCalls.reduce((sum, call) => sum + call.tokens, 0)
  const totalCost = calculateEmbeddingCost(totalTokens)
  const averageTokensPerCall = apiCalls.length > 0 ? Math.round(totalTokens / apiCalls.length) : 0

  return {
    totalTokens,
    totalCost,
    averageTokensPerCall
  }
}

/**
 * 月間コスト上限チェック
 */
export function checkMonthlyCostLimit(
  currentMonthlyCost: number,
  additionalCost: number,
  monthlyLimit: number
): {
  withinLimit: boolean
  remainingBudget: number
  estimatedNewTotal: number
} {
  const estimatedNewTotal = currentMonthlyCost + additionalCost
  const remainingBudget = Math.max(0, monthlyLimit - currentMonthlyCost)
  
  return {
    withinLimit: estimatedNewTotal <= monthlyLimit,
    remainingBudget,
    estimatedNewTotal
  }
}

/**
 * バッチ処理のコスト見積もり
 */
export function estimateBatchCost(
  works: Array<{
    title?: string
    content?: string
    description?: string
    tags?: string[]
  }>,
  estimatedTokensPerField: {
    title: number
    content: number
    description: number
    tags: number
  } = {
    title: 10,      // 平均的なタイトルのトークン数
    content: 2000,  // 平均的なコンテンツのトークン数（チャンク分割される）
    description: 50, // 平均的な概要のトークン数
    tags: 20       // 平均的なタグのトークン数
  }
): {
  estimatedTokens: number
  estimatedCost: number
  breakdown: {
    titles: number
    content: number
    descriptions: number
    tags: number
  }
} {
  let totalTokens = 0
  const breakdown = {
    titles: 0,
    content: 0,
    descriptions: 0,
    tags: 0
  }

  for (const work of works) {
    if (work.title) {
      const titleTokens = Math.min(work.title.length / 3, estimatedTokensPerField.title) // 大まかな推定
      breakdown.titles += titleTokens
      totalTokens += titleTokens
    }

    if (work.content) {
      const contentTokens = Math.min(work.content.length / 3, estimatedTokensPerField.content)
      breakdown.content += contentTokens
      totalTokens += contentTokens
    }

    if (work.description) {
      const descTokens = Math.min(work.description.length / 3, estimatedTokensPerField.description)
      breakdown.descriptions += descTokens
      totalTokens += descTokens
    }

    if (work.tags && work.tags.length > 0) {
      const tagsTokens = Math.min(work.tags.join(' ').length / 3, estimatedTokensPerField.tags)
      breakdown.tags += tagsTokens
      totalTokens += tagsTokens
    }
  }

  return {
    estimatedTokens: Math.round(totalTokens),
    estimatedCost: calculateEmbeddingCost(Math.round(totalTokens)),
    breakdown
  }
}

/**
 * 日別コスト統計を計算
 */
export function calculateDailyStats(
  dailyRecords: Array<{
    date: string
    total_tokens_used: number
    total_api_calls: number
    total_cost_usd: number
  }>
): {
  totalCost: number
  totalTokens: number
  totalApiCalls: number
  averageDailyCost: number
  averageDailyTokens: number
  peakDayCost: number
  peakDayTokens: number
} {
  const totalCost = dailyRecords.reduce((sum, record) => sum + Number(record.total_cost_usd), 0)
  const totalTokens = dailyRecords.reduce((sum, record) => sum + record.total_tokens_used, 0)
  const totalApiCalls = dailyRecords.reduce((sum, record) => sum + record.total_api_calls, 0)
  
  const daysCount = dailyRecords.length
  const averageDailyCost = daysCount > 0 ? totalCost / daysCount : 0
  const averageDailyTokens = daysCount > 0 ? Math.round(totalTokens / daysCount) : 0
  
  const peakDayCost = Math.max(...dailyRecords.map(r => Number(r.total_cost_usd)), 0)
  const peakDayTokens = Math.max(...dailyRecords.map(r => r.total_tokens_used), 0)

  return {
    totalCost: Math.round(totalCost * 1000000) / 1000000, // 6桁精度
    totalTokens,
    totalApiCalls,
    averageDailyCost: Math.round(averageDailyCost * 1000000) / 1000000,
    averageDailyTokens,
    peakDayCost: Math.round(peakDayCost * 1000000) / 1000000,
    peakDayTokens
  }
}

/**
 * コスト効率分析
 */
export function analyzeCostEfficiency(
  totalCost: number,
  totalWorks: number,
  totalTokens: number
): {
  costPerWork: number
  tokensPerWork: number
  efficiency: 'excellent' | 'good' | 'average' | 'poor'
} {
  const costPerWork = totalWorks > 0 ? totalCost / totalWorks : 0
  const tokensPerWork = totalWorks > 0 ? Math.round(totalTokens / totalWorks) : 0

  let efficiency: 'excellent' | 'good' | 'average' | 'poor'
  if (costPerWork < 0.01) {
    efficiency = 'excellent'
  } else if (costPerWork < 0.05) {
    efficiency = 'good'
  } else if (costPerWork < 0.10) {
    efficiency = 'average'
  } else {
    efficiency = 'poor'
  }

  return {
    costPerWork: Math.round(costPerWork * 1000000) / 1000000,
    tokensPerWork,
    efficiency
  }
}