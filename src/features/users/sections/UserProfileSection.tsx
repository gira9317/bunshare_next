'use client'

import { useState } from 'react'
import { UserAvatar } from '../leaf/UserAvatar'
import { UserBio } from '../leaf/UserBio'
import { UserStats } from '../leaf/UserStats'
import { FollowButton } from '../leaf/FollowButton'
import { ProfileEditModal } from '../leaf/ProfileEditModal'
import { FollowListModal } from '../leaf/FollowListModal'
import { LikedWorksModal } from '../leaf/LikedWorksModal'
import { ServiceIcon } from '../leaf/ServiceIcon'
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
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null)
  const [isLikedWorksModalOpen, setIsLikedWorksModalOpen] = useState(false)
  const isOwnProfile = currentUserId === user.id

  const joinedDate = user.sign_in_time 
    ? new Date(user.sign_in_time).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long'
      })
    : '不明'

  return (
    <div className={cn('bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm', className)}>
      {/* Cover Image - Compact mobile first */}
      <div className="relative h-24 md:h-32 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600">
        {user.header_img_url ? (
          <>
            <Image
              src={user.header_img_url}
              alt="Cover"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 opacity-90">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          </div>
        )}
      </div>

      {/* Profile Content - Twitter-like compact design */}
      <div className="relative px-4 pb-3 md:px-6 md:pb-4">
        {/* Avatar and Action Button Layout */}
        <div className="flex items-end justify-between -mt-8 md:-mt-12">
          <UserAvatar
            src={user.avatar_img_url}
            alt={user.username || 'ユーザー'}
            size="lg"
            className="ring-4 ring-white dark:ring-gray-800 w-16 h-16 md:w-20 md:h-20"
          />
          
          {/* Action Button - positioned below header */}
          <div className="mt-8 md:mt-12">
            {isOwnProfile ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs px-4 py-1.5 h-8 font-medium rounded-full border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                プロフィール編集
              </Button>
            ) : (
              <FollowButton
                targetUserId={user.id}
                isFollowing={isFollowing}
                isPending={isPending}
                followApproval={user.follow_approval}
                className="text-xs px-4 py-1.5 h-8 font-medium rounded-full"
              />
            )}
          </div>
        </div>

        {/* User Info - Compact Twitter-style */}
        <div className="mt-2 space-y-2">
          {/* Name and Username */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {user.username || 'ユーザー'}
            </h1>
            {user.custom_user_id && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0">
                @{user.custom_user_id}
              </p>
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {user.bio}
            </div>
          )}

          {/* Meta Info - Improved layout */}
          <div className="space-y-2">
            {/* Join date */}
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>{joinedDate}に登録</span>
            </div>
            
            {/* Website links - Multiple links support */}
            {user.website_url && user.website_url.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {user.website_url.filter(url => url.trim()).slice(0, 3).map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline text-sm"
                    title={url}
                  >
                    <ServiceIcon url={url} className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate max-w-[160px] sm:max-w-[200px]">
                      {url.replace(/^https?:\/\/(www\.)?/, '')}
                    </span>
                  </a>
                ))}
                {user.website_url.filter(url => url.trim()).length > 3 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    +{user.website_url.filter(url => url.trim()).length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats - Twitter-style compact */}
          <div className="flex items-center gap-6 text-sm pt-2">
            <button 
              onClick={() => setFollowModalType('following')}
              className="hover:underline transition-all"
            >
              <span className="font-bold text-gray-900 dark:text-gray-100">{user.stats.following_count}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">フォロー中</span>
            </button>
            <button 
              onClick={() => setFollowModalType('followers')}
              className="hover:underline transition-all"
            >
              <span className="font-bold text-gray-900 dark:text-gray-100">{user.stats.followers_count}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">フォロワー</span>
            </button>
            {user.stats.works_count > 0 && (
              <span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{user.stats.works_count}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">作品</span>
              </span>
            )}
          </div>
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
      
      {/* Follow List Modal */}
      {followModalType && (
        <FollowListModal
          isOpen={true}
          onClose={() => setFollowModalType(null)}
          userId={user.id}
          currentUserId={currentUserId}
          type={followModalType}
        />
      )}
      
      {/* Liked Works Modal */}
      <LikedWorksModal
        isOpen={isLikedWorksModalOpen}
        onClose={() => setIsLikedWorksModalOpen(false)}
        userId={user.id}
      />
    </div>
  )
}