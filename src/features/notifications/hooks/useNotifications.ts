'use client'

import { useState, useCallback, useEffect } from 'react'
import { Notification } from '../types'
import { markAsRead as markAsReadAction } from '../server/actions'

export function useNotifications(
  initialNotifications: Notification[] = [],
  initialUnreadCount: number = 0
) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set())
  
  const markAsRead = useCallback(async (notificationId: string) => {
    if (markingAsRead.has(notificationId)) return
    
    // ローディング状態を設定
    setMarkingAsRead(prev => new Set([...prev, notificationId]))
    
    try {
      // 楽観的更新: UIを即座に更新
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // サーバーアクションを呼び出し
      await markAsReadAction(notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // エラー時のロールバック
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: false } : n
        )
      )
      setUnreadCount(prev => prev + 1)
      setError('通知の既読処理に失敗しました')
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }, [markingAsRead])
  
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, is_read: true }))
    )
    setUnreadCount(0)
  }, [])
  
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId)
      if (notification && !notification.is_read) {
        setUnreadCount(c => Math.max(0, c - 1))
      }
      return prev.filter(n => n.id !== notificationId)
    })
  }, [])
  
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1)
    }
  }, [])
  
  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
    setNotifications,
    setUnreadCount,
    setIsLoading,
    setError,
    markingAsRead
  }
}