import { z } from 'zod'

export const notificationTypeSchema = z.enum([
  'like',
  'comment',
  'follow',
  'follow_request',
  'follow_approved',
  'work_published',
  'system'
])

export const notificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  related_user_id: z.string().uuid().nullable(),
  related_work_id: z.string().uuid().nullable(),
  action_url: z.string().url().nullable(),
  is_read: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Notification = z.infer<typeof notificationSchema>
export type NotificationType = z.infer<typeof notificationTypeSchema>