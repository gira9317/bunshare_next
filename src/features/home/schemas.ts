import { z } from 'zod'

export const recommendationResultSchema = z.object({
  works: z.array(z.any()), // Work[]の詳細スキーマは works/schemas.ts にあるため
  strategy: z.enum(['personalized', 'adaptive', 'popular']),
  source: z.string(),
  total: z.number()
})

export const userBehaviorDataSchema = z.object({
  likes_count: z.number().min(0),
  bookmarks_count: z.number().min(0),
  views_count: z.number().min(0),
  shares_count: z.number().min(0),
  comments_count: z.number().min(0),
  follows_count: z.number().min(0)
})

export const recommendationStrategySchema = z.object({
  type: z.enum(['personalized', 'adaptive', 'popular']),
  weights: z.object({
    personalized: z.number().min(0).max(1),
    collaborative: z.number().min(0).max(1),
    popular: z.number().min(0).max(1),
    diversity: z.number().min(0).max(1)
  })
})

export const userPreferenceSchema = z.object({
  category: z.string(),
  tags: z.array(z.string()),
  weight: z.number().min(0).max(1),
  last_interacted: z.string()
})

export type RecommendationResultSchema = z.infer<typeof recommendationResultSchema>
export type UserBehaviorDataSchema = z.infer<typeof userBehaviorDataSchema>
export type RecommendationStrategySchema = z.infer<typeof recommendationStrategySchema>
export type UserPreferenceSchema = z.infer<typeof userPreferenceSchema>