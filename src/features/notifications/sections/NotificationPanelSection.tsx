'use client'

import { useState } from 'react'
import { Notification } from '../types'
import { NotificationItem } from '../leaf/NotificationItem'
import { NotificationEmpty } from '../leaf/NotificationEmpty'
import { NotificationBadge } from '../leaf/NotificationBadge'
import { useNotifications } from '../hooks/useNotifications'
import { cn } from '@/lib/utils'

interface NotificationPanelSectionProps {
  userId: string
  initialNotifications?: Notification[]
  initialUnreadCount?: number
  className?: string
}

export function NotificationPanelSection({
  userId,
  initialNotifications = [],
  initialUnreadCount = 0,
  className
}: NotificationPanelSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading
  } = useNotifications(initialNotifications, initialUnreadCount)
  
  const handleToggle = () => {
    setIsOpen(!isOpen)
  }
  
  const handleClose = () => {
    setIsOpen(false)
  }
  
  const handleMarkAllAsRead = () => {
    // Client-side only update for now
    markAllAsRead()
  }
  
  return (
    <div className={cn('relative', className)}>
      <NotificationBadge
        count={unreadCount}
        onClick={handleToggle}
      />
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />
          
          <div className={cn(
            'absolute right-0 top-full mt-2',
            'w-80 sm:w-96 max-h-[70vh]',
            'bg-white dark:bg-gray-800',
            'rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
            'z-50 overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            'flex flex-col'
          )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                通知
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    すべて既読にする
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M18 6L6 18M6 6l12 12" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <NotificationEmpty />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full text-xs text-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  すべての通知を見る
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}