'use client'

import { useState } from 'react'
import { UserAvatar } from '../leaf/UserAvatar'
import { UserBio } from '../leaf/UserBio'
import { UserStats } from '../leaf/UserStats'
import { FollowButton } from '../leaf/FollowButton'
import { ProfileEditModal } from '../leaf/ProfileEditModal'
import { UserWithStats } from '../schemas'
import { Button } from '@/components/ui/button'
// import { Settings, Link2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface UserProfileSectionProps {
  user: UserWithStats
  currentUserId?: string | null
  isFollowing?: boolean
  isPending?: boolean
  className?: string
}

export function UserProfileSection({ 
  user, 
  currentUserId,
  isFollowing = false,
  isPending = false,
  className 
}: UserProfileSectionProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const isOwnProfile = currentUserId === user.id
  const joinedDate = new Date(user.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long'
  })

  return (
    <div className={cn('bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm', className)}>
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
        {user.cover_url && (
          <Image
            src={user.cover_url}
            alt="Cover"
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-20" />
      </div>

      {/* Profile Content */}
      <div className="relative px-6 pb-6">
        {/* Avatar positioned over cover */}
        <div className="flex items-end justify-between -mt-16">
          <UserAvatar
            src={user.avatar_url}
            alt={user.display_name || user.username}
            size="xl"
            className="ring-4 ring-white dark:ring-gray-800"
          />
          
          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            {isOwnProfile ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                プロフィール編集
              </Button>
            ) : (
              <FollowButton
                targetUserId={user.id}
                isFollowing={isFollowing}
                isPending={isPending}
                followApprovalRequired={user.follow_approval_required}
              />
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="mt-4 space-y-4">
          {/* Name and Username */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {user.display_name || user.username}
            </h1>
            {user.display_name && (
              <p className="text-gray-600 dark:text-gray-400">
                @{user.username}
              </p>
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <UserBio bio={user.bio} />
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>{joinedDate}に登録</span>
            </div>
            
            {user.website_url && (
              <a
                href={user.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="truncate max-w-[200px]">
                  {typeof user.website_url === 'string' 
                    ? user.website_url.replace(/^https?:\/\//, '') 
                    : user.website_url
                  }
                </span>
              </a>
            )}
          </div>

          {/* Stats */}
          <UserStats stats={user.stats} />
        </div>
      </div>
      
      {/* Profile Edit Modal */}
      {isOwnProfile && (
        <ProfileEditModal
          user={user}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  )
}