import { z } from 'zod'

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(1).max(50).nullable(),
  custom_user_id: z.string().max(50).nullable(),
  bio: z.string().max(500).nullable(),
  avatar_img_url: z.string().url().nullable(),
  header_img_url: z.string().url().nullable(),
  website_url: z.array(z.string().url()).nullable(),
  birth_date: z.string().nullable(),
  gender: z.string().nullable(),
  public_profile: z.boolean().default(true),
  follow_approval: z.boolean().default(false),
  like_notification: z.boolean().default(true),
  comment_notification: z.boolean().default(true),
  follow_notification: z.boolean().default(true),
  email_notification: z.boolean().default(false),
  hide_bookmark_modal: z.boolean().default(false),
  sign_in_time: z.string(),
  role: z.string().default('user'),
  provider: z.string().nullable(),
  agree_marketing: z.boolean().default(false),
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
  followed_id: z.string().uuid(),
  status: z.enum(['pending', 'approved']).default('approved'),
  created_at: z.string(),
})

export const userProfileUpdateSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  custom_user_id: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_img_url: z.string().url().optional(),
  header_img_url: z.string().url().optional(),
  website_url: z.array(z.string().url()).optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  public_profile: z.boolean().optional(),
  follow_approval: z.boolean().optional(),
  like_notification: z.boolean().optional(),
  comment_notification: z.boolean().optional(),
  follow_notification: z.boolean().optional(),
  email_notification: z.boolean().optional(),
  hide_bookmark_modal: z.boolean().optional(),
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

export const seriesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  cover_image_url: z.string().nullable(),
  created_at: z.string(),
  works_count: z.number().int().min(0).default(0).optional(),
  work_images: z.array(z.string()).optional(),
  latest_work_image: z.string().nullable().optional(),
  total_views: z.number().int().min(0).default(0).optional(),
  total_likes: z.number().int().min(0).default(0).optional(),
})

export type Series = z.infer<typeof seriesSchema>