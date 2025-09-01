'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from './UserAvatar'
import { FollowButton } from './FollowButton'
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
        ? `/api/users/${userId}/followers`
        : `/api/users/${userId}/following`
      
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
        'w-full max-w-md max-h-[80vh] overflow-hidden',
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
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={user.avatar_img_url}
                      alt={user.username || 'ユーザー'}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {user.username || 'ユーザー'}
                      </p>
                      {user.custom_user_id && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.custom_user_id}
                        </p>
                      )}
                      {user.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {currentUserId && currentUserId !== user.id && (
                    <FollowButton
                      targetUserId={user.id}
                      isFollowing={false} // TODO: Get actual follow status
                      className="min-w-0 px-3 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}