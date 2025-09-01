'use client'

import { cn } from '@/lib/utils'
import { UserStats as UserStatsType } from '../schemas'

interface UserStatsProps {
  stats: UserStatsType
  className?: string
  onFollowersClick?: () => void
  onFollowingClick?: () => void
  onWorksClick?: () => void
  onLikesClick?: () => void
}

interface StatItemProps {
  label: string
  count: number
  onClick?: () => void
}

function StatItem({ label, count, onClick }: StatItemProps) {
  return (
    <div 
      className={cn(
        'text-center',
        onClick && 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
      )}
      onClick={onClick}
    >
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {count.toLocaleString()}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </div>
    </div>
  )
}

export function UserStats({ 
  stats, 
  className,
  onFollowersClick,
  onFollowingClick,
  onWorksClick,
  onLikesClick
}: UserStatsProps) {
  return (
    <div className={cn('flex justify-between gap-8', className)}>
      <StatItem 
        label="作品"
        count={stats.works_count}
        onClick={onWorksClick}
      />
      <StatItem 
        label="フォロワー"
        count={stats.followers_count}
        onClick={onFollowersClick}
      />
      <StatItem 
        label="フォロー中"
        count={stats.following_count}
        onClick={onFollowingClick}
      />
      <StatItem 
        label="いいね"
        count={stats.likes_count}
        onClick={onLikesClick}
      />
    </div>
  )
}