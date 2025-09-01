'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAsRead(notificationId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  
  if (error) {
    console.error('Error marking notification as read:', error)
    throw new Error('通知の既読処理に失敗しました')
  }
  
  revalidatePath('/', 'layout')
}

export async function markAllAsRead(userId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  
  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw new Error('一括既読処理に失敗しました')
  }
  
  revalidatePath('/', 'layout')
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
  
  if (error) {
    console.error('Error deleting notification:', error)
    throw new Error('通知の削除に失敗しました')
  }
  
  revalidatePath('/', 'layout')
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedData?: {
    related_user_id?: string
    related_work_id?: string
    action_url?: string
  }
) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      ...relatedData
    })
  
  if (error) {
    console.error('Error creating notification:', error)
    throw new Error('通知の作成に失敗しました')
  }
  
  revalidatePath('/', 'layout')
}