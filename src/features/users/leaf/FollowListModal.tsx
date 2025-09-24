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
  userDisplayName?: string // ユーザーの表示名
  userCount?: number // フォロー/フォロワーの数
  className?: string
}

export function FollowListModal({
  isOpen,
  onClose,
  userId,
  currentUserId,
  type,
  userDisplayName,
  userCount,
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
  const countText = type === 'followers' 
    ? `${userCount || users.length} フォロワー` 
    : `${userCount || users.length} フォロー中`

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Full Page Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-500 hovertext-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">戻る</span>
            </button>
          </div>
          {/* Username and count display */}
          <div className="pl-8">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {userDisplayName?.replace('@', '') || 'username'}
            </h1>
            <h2 className="text-sm text-gray-600">
              {countText}
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {type === 'followers' ? 'フォロワーはいません' : 'フォローしているユーザーはいません'}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 各ユーザーごとにカードを縦に並べる */}
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUserId={currentUserId}
                compact={false}
                onUserClick={(userId) => {
                  // Navigate to user profile and close modal
                  window.location.href = `/app/profile/${userId}`
                  onClose()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}