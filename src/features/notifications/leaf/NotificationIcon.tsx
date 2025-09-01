import { NotificationType } from '../types'

interface NotificationIconProps {
  type: NotificationType
  className?: string
}

const iconMap: Record<NotificationType, string> = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  follow_request: '👋',
  follow_approved: '✅',
  work_published: '📚',
  system: '🔔',
}

export function NotificationIcon({ type, className }: NotificationIconProps) {
  return (
    <span className={className}>
      {iconMap[type] || '📢'}
    </span>
  )
}