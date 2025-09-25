import { z } from 'zod'

export const SeriesSchema = z.object({
  series_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  cover_image_url: z.string().nullable(),
})

export const DraftSchema = z.object({
  work_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  category: z.string().nullable(),
  updated_at: z.string(),
  is_adult_content: z.boolean(),
})

export const PostFormSchema = z.object({
  title: z.string().min(1, '題名は必須です').max(255, '題名は255文字以内にしてください'),
  description: z.string().max(1000, '説明文は1000文字以内にしてください').nullable(),
  content: z.string().min(1, '本文は必須です'),
  category: z.enum(['novel', 'essay', 'poem', 'other']),
  tags: z.array(z.string()).max(10, 'タグは10個までです'),
  image_url: z.string().url().optional(),
  series_id: z.string().optional(),
  episode_number: z.number().int().positive().optional(),
  is_adult_content: z.boolean().default(false),
  is_private: z.boolean().default(false),
  is_published: z.boolean().default(false),
})