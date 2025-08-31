import { z } from 'zod'

export const workSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  author_id: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image_url: z.string().url().optional(),
  series_title: z.string().optional(),
  episode_number: z.number().optional(),
  is_adult_content: z.boolean().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  view_count: z.number().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  bookmark_count: z.number().optional(),
})

export type WorkSchema = z.infer<typeof workSchema>