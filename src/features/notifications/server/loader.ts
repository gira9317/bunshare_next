import { createClient } from '@/lib/supabase/server'
import { Notification } from '../types'
import { cache } from 'react'

export const getNotifications = cache(async (
  userId: string,
  limit: number = 20
): Promise<Notification[]> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  
  return data as Notification[]
})

export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  
  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }
  
  return count || 0
})

export const getCurrentUserNotifications = cache(async (
  limit: number = 20
): Promise<{ notifications: Notification[], unreadCount: number }> => {
  const supabase = await createClient()
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return { notifications: [], unreadCount: 0 }
    }
    
    const [notifications, unreadCount] = await Promise.all([
      getNotifications(session.user.id, limit),
      getUnreadCount(session.user.id)
    ])
    
    return { notifications, unreadCount }
  } catch (error) {
    console.error('getCurrentUserNotifications error:', error)
    return { notifications: [], unreadCount: 0 }
  }
})

export const getNotificationsByUser = cache(async (
  user: { id: string },
  limit: number = 20
): Promise<{ notifications: Notification[], unreadCount: number }> => {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(user.id, limit),
    getUnreadCount(user.id)
  ])
  
  return { notifications, unreadCount }
})