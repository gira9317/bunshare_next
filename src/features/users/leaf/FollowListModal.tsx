'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UserCard } from './UserCard'
import { cn } from '@/lib/utils'

interface FollowUser {
  id: string
  username: string | null
  custom_user_id: string | null
  avatar_img_url: string | null
  bio: string | null
}

interface FollowListModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentUserId?: string | null
  type: 'followers' | 'following'
  className?: string
}

export function FollowListModal({
  isOpen,
  onClose,
  userId,
  currentUserId,
  type,
  className
}: FollowListModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen, userId, type])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const endpoint = type === 'followers' 
        ? `/api/profile/${userId}/followers`
        : `/api/profile/${userId}/following`
      
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const title = type === 'followers' ? 'フォロワー' : 'フォロー中'

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
        // Mobile: full width with margin, max height
        'w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-hidden',
        // Tablet and desktop: larger modal
        'md:max-w-2xl md:max-h-[80vh]',
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50',
        'border border-gray-200 dark:border-gray-700',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {type === 'followers' ? 'フォロワーはいません' : 'フォローしているユーザーはいません'}
            </div>
          ) : (
            <div className={cn(
              'p-4',
              // Mobile: single column with spacing
              'space-y-3',
              // Tablet and desktop: 2 column grid
              'md:grid md:grid-cols-2 md:gap-4 md:space-y-0'
            )}>
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                  compact={true}
                  onUserClick={(userId) => {
                    // Navigate to user profile and close modal
                    window.location.href = `/profile/${userId}`
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}