export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  related_user_id: string | null
  related_work_id: string | null
  action_url: string | null
  is_read: boolean
  created_at: string
  updated_at: string
}

export type NotificationType = 
  | 'like'
  | 'comment'
  | 'follow'
  | 'follow_request'
  | 'follow_approved'
  | 'work_published'
  | 'system'

export interface NotificationPanelState {
  isOpen: boolean
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
}

export interface NotificationIconMap {
  [key: string]: string
}