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
    <div className={cn('bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm', className)}>
      {/* Cover Image - Mobile first */}
      <div className="relative h-32 md:h-48 bg-gradient-to-r from-blue-500 to-purple-600">
        {user.header_img_url ? (
          <>
            {/* Use Next.js Image with proper z-index */}
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
          <div className="absolute inset-0 flex items-center justify-center text-white text-opacity-50">
            <span>ヘッダー画像なし</span>
          </div>
        )}
      </div>

      {/* Profile Content - Mobile first padding */}
      <div className="relative px-4 pb-4 md:px-6 md:pb-6">
        {/* Avatar positioned over cover - Mobile first positioning */}
        <div className="flex items-end justify-between -mt-12 md:-mt-16">
          <UserAvatar
            src={user.avatar_img_url}
            alt={user.username || 'ユーザー'}
            size="lg"
            className="ring-4 ring-white dark:ring-gray-800 w-16 h-16 md:w-32 md:h-32"
          />
          
          {/* Action Buttons - Mobile first layout */}
          <div className="flex flex-col gap-2 mb-3 md:flex-row md:gap-3 md:mb-4">
            {isOwnProfile ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs md:text-sm px-3 py-2"
              >
                <svg className="w-3 h-3 mr-1 md:w-4 md:h-4 md:mr-2" viewBox="0 0 24 24" fill="none">
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
                followApproval={user.follow_approval}
                className="text-xs md:text-sm px-3 py-2"
              />
            )}
          </div>
        </div>

        {/* User Info - Mobile first spacing */}
        <div className="mt-3 space-y-3 md:mt-4 md:space-y-4">
          {/* Name and Username - Mobile first text sizes */}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">
              {user.username || 'ユーザー'}
            </h1>
            {user.custom_user_id && (
              <p className="text-sm text-gray-600 dark:text-gray-400 md:text-base">
                @{user.custom_user_id}
              </p>
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <UserBio bio={user.bio} />
          )}

          {/* Meta Info - Mobile first layout */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 md:gap-4 md:text-sm">
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span className="hidden sm:inline">{joinedDate}に登録</span>
              <span className="sm:hidden">{joinedDate}</span>
            </div>
            
            {user.website_url && user.website_url.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {user.website_url.filter(url => url.trim()).slice(0, 2).map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title={url}
                  >
                    <ServiceIcon url={url} className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="break-all truncate max-w-[100px] md:max-w-none">
                      {url.replace(/^https?:\/\//, '')}
                    </span>
                  </a>
                ))}
                {user.website_url.filter(url => url.trim()).length > 2 && (
                  <span className="hidden md:inline">...</span>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <UserStats 
            stats={user.stats}
            onFollowersClick={() => setFollowModalType('followers')}
            onFollowingClick={() => setFollowModalType('following')}
            onLikesClick={() => setIsLikedWorksModalOpen(true)}
          />
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