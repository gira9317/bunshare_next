import type { Work } from '@/features/works/types'

export interface RecommendationResult {
  works: (Work & { is_challenge_recommendation?: boolean })[]
  strategy: 'personalized' | 'adaptive' | 'popular'
  source: string
  total: number
}

export interface UserBehaviorData {
  likes_count: number
  bookmarks_count: number
  views_count: number
  shares_count: number
  comments_count: number
  follows_count: number
}

export interface RecommendationStrategy {
  type: 'personalized' | 'adaptive' | 'popular'
  weights: {
    personalized: number
    collaborative: number
    popular: number
    diversity: number
  }
}

export interface UserPreference {
  category: string
  tags: string[]
  weight: number
  last_interacted: string
}

export interface ChallengeRecommendation {
  type: 'new_category' | 'new_author' | 'trending' | 'quality_discovery'
  work: Work & { is_challenge_recommendation?: boolean }
  reason: string
}