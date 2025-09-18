'use client'

import { Notification } from '../types'
import { NotificationIcon } from './NotificationIcon'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/utils'

interface NotificationItemProps {
  notification: Notification
  onRead?: (id: string) => void
  className?: string
}

export function NotificationItem({ 
  notification, 
  onRead,
  className 
}: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at))
  
  const handleClick = () => {
    if (!notification.is_read) {
      // Client-side only update for now
      onRead?.(notification.id)
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }
  
  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex gap-3 px-4 py-3',
        'hover:bg-gray-800',
        'cursor-pointer transition-colors',
        !notification.is_read && 'bg-blue-50/50',
        className
      )}
    >
      <div className="flex-shrink-0 text-xl">
        <NotificationIcon type={notification.type} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm text-gray-900',
          !notification.is_read && 'font-semibold'
        )}>
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {timeAgo}
        </p>
      </div>
      
      {!notification.is_read && (
        <div className="flex-shrink-0">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        </div>
      )}
    </div>
  )
}