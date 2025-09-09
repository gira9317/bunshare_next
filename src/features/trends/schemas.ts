import { z } from 'zod';

export const trendTabSchema = z.enum(['recommended', 'works-ranking', 'users-ranking', 'announcements']);

export const trendingWorkSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    avatar_url: z.string().optional(),
  }),
  thumbnail_url: z.string().optional(),
  category: z.string(),
  tags: z.array(z.string()),
  like_count: z.number(),
  view_count: z.number(),
  trend_score: z.number(),
  created_at: z.string(),
});

export const trendTagSchema = z.object({
  tag: z.string(),
  count: z.number(),
  trend_score: z.number(),
  growth_rate: z.number(),
});

export const heroBannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  link_url: z.string().optional(),
  is_active: z.boolean(),
  priority: z.number(),
});

export const worksRankingSchema = z.object({
  id: z.string(),
  title: z.string(),
  author_name: z.string(),
  thumbnail_url: z.string().optional(),
  rank: z.number(),
  score: z.number(),
  period: z.enum(['daily', 'weekly', 'monthly']),
});

export const usersRankingSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar_url: z.string().optional(),
  followers_count: z.number(),
  works_count: z.number(),
  rank: z.number(),
  score: z.number(),
  period: z.enum(['daily', 'weekly', 'monthly']),
});

export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(['update', 'maintenance', 'feature', 'notice']),
  published_at: z.string(),
  is_important: z.boolean(),
});