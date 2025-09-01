import { z } from 'zod'

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(1).max(50),
  display_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  is_public: z.boolean().default(true),
  follow_approval_required: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
})

export const userStatsSchema = z.object({
  followers_count: z.number().int().min(0).default(0),
  following_count: z.number().int().min(0).default(0),
  works_count: z.number().int().min(0).default(0),
  likes_count: z.number().int().min(0).default(0),
  bookmarks_count: z.number().int().min(0).default(0),
})

export const userWithStatsSchema = userProfileSchema.extend({
  stats: userStatsSchema,
})

export const followRelationSchema = z.object({
  follower_id: z.string().uuid(),
  following_id: z.string().uuid(),
  status: z.enum(['pending', 'approved']).default('approved'),
  created_at: z.string(),
})

export const userProfileUpdateSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  display_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  is_public: z.boolean().optional(),
  follow_approval_required: z.boolean().optional(),
})

export const userWorkSchema = z.object({
  work_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  content: z.string().optional(),
  category: z.string(),
  is_published: z.boolean(),
  is_private: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  likes_count: z.number().int().min(0).default(0),
  comments_count: z.number().int().min(0).default(0),
  views_count: z.number().int().min(0).default(0),
})

export type UserProfile = z.infer<typeof userProfileSchema>
export type UserStats = z.infer<typeof userStatsSchema>
export type UserWithStats = z.infer<typeof userWithStatsSchema>
export type FollowRelation = z.infer<typeof followRelationSchema>
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>
export type UserWork = z.infer<typeof userWorkSchema>