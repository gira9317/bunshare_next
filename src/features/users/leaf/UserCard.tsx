'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
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
    const fetchUserData = async () => {
      try {
        const statsResponse = await fetch(`/api/users/${user.id}/stats`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

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
      window.location.href = `/users/${user.id}`
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return Math.floor(num / 100000) / 10 + 'M'
    if (num >= 10000) return Math.floor(num / 1000) / 10 + '万'
    if (num >= 1000) return Math.floor(num / 100) / 10 + 'K'
    return num.toString()
  }

  const getInitials = (name: string | null): string => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800',
        'rounded-2xl border border-gray-200 dark:border-gray-700',
        'transition-all duration-300 cursor-pointer',
        'hover:border-purple-400/40 hover:shadow-lg hover:-translate-y-0.5',
        'shadow-sm backdrop-blur-xl w-full',
        'p-4 min-h-[6rem]',
        compact && 'p-3 min-h-[5rem]',
        className
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          <div className={cn(
            'rounded-full overflow-hidden',
            'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700',
            'flex items-center justify-center',
            'border-2 border-white dark:border-gray-800',
            'shadow-md w-12 h-12',
            compact && 'w-10 h-10'
          )}>
            {user.avatar_img_url ? (
              <img
                src={user.avatar_img_url}
                alt={user.username || 'ユーザー'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={cn(
                'text-white font-bold uppercase text-lg',
                compact && 'text-base'
              )}>
                {getInitials(user.username)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1.5">
            {/* Name, username and Follow Button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight',
                  compact && 'text-base'
                )}>
                  {user.username || 'ユーザー'}
                </h3>
                {user.custom_user_id && (
                  <p className={cn(
                    'text-gray-500 dark:text-gray-400 text-xs mt-0.5',
                    compact && 'text-xs'
                  )}>
                    @{user.custom_user_id}
                  </p>
                )}
              </div>
              
              {/* Follow Button - 右側に配置 */}
              {!isSelf && currentUserId && (
                <div className="flex-shrink-0">
                  <FollowButton
                    targetUserId={user.id}
                    isFollowing={isFollowing}
                    isPending={isPending}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'rounded-full font-medium transition-all duration-300',
                      'h-7 text-xs px-3',
                      compact && 'h-6 text-xs px-2.5'
                    )}
                  />
                </div>
              )}
            </div>

            {/* Bio - 最大2行表示 */}
            {user.bio && !compact && (
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">
                {user.bio}
              </p>
            )}

            {/* Stats - 横並びで数値とラベルを同じ行に */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  'font-bold text-gray-900 dark:text-gray-100 text-base',
                  compact && 'text-sm'
                )}>
                  {formatNumber(stats.works_count)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">作品</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  'font-bold text-gray-900 dark:text-gray-100 text-base',
                  compact && 'text-sm'
                )}>
                  {formatNumber(stats.following_count)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">フォロー</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  'font-bold text-gray-900 dark:text-gray-100 text-base',
                  compact && 'text-sm'
                )}>
                  {formatNumber(stats.followers_count)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">フォロワー</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}