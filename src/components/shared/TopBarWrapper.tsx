'use client'

import { useState, useEffect } from 'react'
import { TopBar } from './TopBar'
import type { UserProfile } from '@/features/users_icon/types'
import type { Notification } from '@/features/notifications/types'

interface TopBarWrapperProps {
  onMobileSearchOpen?: () => void
}

export function TopBarWrapper({ onMobileSearchOpen }: TopBarWrapperProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true)
        console.log('TopBarWrapper: Loading user data...')
        
        // サーバーからユーザーデータをフェッチ
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setUserProfile(data.userProfile)
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('TopBarWrapper error:', error)
        setUserProfile(null)
        setNotifications([])
        setUnreadCount(0)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  return (
    <TopBar 
      userProfile={userProfile}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
      onMobileSearchOpen={onMobileSearchOpen}
    />
  )
}