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

export const commentSchema = z.object({
  review_id: z.string().uuid(),
  work_id: z.string().uuid(),
  user_id: z.string().uuid(),
  comment: z.string().min(1, 'コメントを入力してください').max(1000, 'コメントは1000文字以内で入力してください'),
  created_at: z.string(),
  updated_at: z.string(),
  user: z.object({
    id: z.string().uuid(),
    username: z.string(),
    avatar_url: z.string().nullable().optional()
  }).optional()
})

export type CommentSchema = z.infer<typeof commentSchema>

export const readingBookmarkSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  work_id: z.string().uuid(),
  scroll_position: z.number().min(0, 'スクロール位置は0以上である必要があります'),
  reading_progress: z.number().min(0).max(100, '読書進捗は0-100%の範囲である必要があります'),
  bookmark_text: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
})

export type ReadingBookmarkSchema = z.infer<typeof readingBookmarkSchema>

export const shareRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  work_id: z.string().uuid(),
  share_type: z.enum(['twitter', 'facebook', 'line', 'copy_link', 'native']),
  shared_at: z.string(),
  shared_url: z.string().url().nullable().optional(),
  share_text: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
})

export type ShareRecordSchema = z.infer<typeof shareRecordSchema>