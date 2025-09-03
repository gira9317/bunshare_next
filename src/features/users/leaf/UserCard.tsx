'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { UserAvatar } from './UserAvatar'
import { FollowButton } from './FollowButton'

interface UserCardProps {
  user: {
    id: string
    username: string | null
    custom_user_id: string | null
    avatar_img_url: string | null
    bio: string | null
    works_count?: number
    followers_count?: number
    following_count?: number
  }
  currentUserId?: string | null
  compact?: boolean
  className?: string
  onUserClick?: (userId: string) => void
}

interface UserStats {
  works_count: number
  followers_count: number
  following_count: number
}

export function UserCard({
  user,
  currentUserId,
  compact = false,
  className,
  onUserClick
}: UserCardProps) {
  const [stats, setStats] = useState<UserStats>({
    works_count: user.works_count || 0,
    followers_count: user.followers_count || 0,
    following_count: user.following_count || 0
  })
  const [isFollowing, setIsFollowing] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const isSelf = currentUserId === user.id

  useEffect(() => {
    // Fetch user stats and follow status
    const fetchUserData = async () => {
      try {
        // Get user stats
        const statsResponse = await fetch(`/api/users/${user.id}/stats`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

        // Get follow status if current user exists
        if (currentUserId && !isSelf) {
          const followResponse = await fetch(`/api/users/${user.id}/follow-status?currentUserId=${currentUserId}`)
          if (followResponse.ok) {
            const followData = await followResponse.json()
            setIsFollowing(followData.isFollowing)
            setIsPending(followData.isPending)
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }

    fetchUserData()
  }, [user.id, currentUserId, isSelf])

  const handleCardClick = () => {
    if (onUserClick) {
      onUserClick(user.id)
    } else {
      // Default navigation to user profile
      window.location.href = `/users/${user.id}`
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return Math.floor(num / 100000) / 10 + 'M'
    }
    if (num >= 10000) {
      return Math.floor(num / 1000) / 10 + '万'
    }
    if (num >= 1000) {
      return Math.floor(num / 100) / 10 + 'K'
    }
    return num.toString()
  }

  const getInitials = (name: string | null): string => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div
      className={cn(
        // Base mobile-first styles
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        'transition-all duration-300 cursor-pointer',
        'hover:border-purple-400 hover:shadow-lg hover:-translate-y-1',
        'backdrop-blur-sm',
        
        // Mobile: compact vertical layout
        compact ? 'p-3 min-h-[80px]' : 'p-4 min-h-[100px]',
        
        // Tablet and desktop: more spacious
        'md:p-4 md:min-h-[120px]',
        
        className
      )}
      onClick={handleCardClick}
    >
      <div className={cn(
        'flex gap-3',
        // Mobile: tight spacing
        compact ? 'gap-2' : 'gap-3',
        // Desktop: more spacing
        'md:gap-4'
      )}>
        {/* Avatar - Mobile optimized */}
        <div className="flex-shrink-0 relative">
          <div className={cn(
            'rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-blue-500',
            'border-2 border-white dark:border-gray-800 shadow-md',
            // Mobile: 40px avatar
            compact ? 'w-10 h-10' : 'w-12 h-12',
            // Desktop: larger avatar
            'md:w-16 md:h-16'
          )}>
            {user.avatar_img_url ? (
              <img
                src={user.avatar_img_url}
                alt={user.username || 'ユーザー'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {getInitials(user.username)}
              </div>
            )}
          </div>
        </div>

        {/* Content - Mobile first */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1">
            {/* Name and username */}
            <div>
              <h3 className={cn(
                'font-bold text-gray-900 dark:text-gray-100 truncate',
                // Mobile: 14px
                compact ? 'text-sm' : 'text-base',
                // Desktop: 16px
                'md:text-lg'
              )}>
                {user.username || 'ユーザー'}
              </h3>
              {user.custom_user_id && (
                <p className={cn(
                  'text-gray-500 dark:text-gray-400 truncate',
                  // Mobile: 12px
                  'text-xs',
                  // Desktop: 14px  
                  'md:text-sm'
                )}>
                  @{user.custom_user_id}
                </p>
              )}
            </div>

            {/* Bio - Only show on mobile if compact=false */}
            {user.bio && !compact && (
              <p className={cn(
                'text-gray-600 dark:text-gray-300 line-clamp-2',
                // Mobile: 12px, hide on very small screens
                'text-xs hidden xs:block',
                // Desktop: 14px, always show
                'md:text-sm md:block'
              )}>
                {user.bio}
              </p>
            )}

            {/* Stats - Mobile horizontal layout */}
            <div className={cn(
              'flex gap-4 pt-1',
              // Mobile: smaller spacing
              'gap-3 text-xs',
              // Desktop: more spacing
              'md:gap-6 md:text-sm'
            )}>
              <div className="text-center">
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(stats.works_count)}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                  作品
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(stats.following_count)}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                  フォロー
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(stats.followers_count)}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                  フォロワー
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action button - Mobile optimized */}
        {!isSelf && currentUserId && (
          <div className="flex-shrink-0 flex items-start pt-1">
            <FollowButton
              targetUserId={user.id}
              isFollowing={isFollowing}
              isPending={isPending}
              className={cn(
                // Mobile: compact button
                'min-w-[80px] h-8 text-xs px-3',
                // Desktop: larger button
                'md:min-w-[100px] md:h-10 md:text-sm md:px-4'
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}