'use client'

import { UserStats } from '../schemas'
import { cn } from '@/lib/utils'
// import { TrendingUp, Users, Heart, BookOpen } from 'lucide-react'

interface UserStatsSectionProps {
  stats: UserStats
  className?: string
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {label}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value.toLocaleString()}
        </div>
        
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-sm',
            trend.isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          )}>
            <svg className={cn(
              'w-4 h-4',
              !trend.isPositive && 'rotate-180'
            )} viewBox="0 0 24 24" fill="none">
              <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" stroke="currentColor" strokeWidth="2"/>
              <polyline points="16,7 22,7 22,13" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>
              {trend.isPositive ? '+' : ''}{trend.value}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function UserStatsSection({ stats, className }: UserStatsSectionProps) {
  const statCards = [
    {
      icon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      label: '投稿作品',
      value: stats.works_count,
    },
    {
      icon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      label: 'フォロワー',
      value: stats.followers_count,
    },
    {
      icon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      label: '獲得いいね',
      value: stats.likes_count,
    },
    {
      icon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      label: 'ブックマーク',
      value: stats.bookmarks_count,
    },
  ]

  return (
    <div className={cn('space-y-6', className)}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        統計情報
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>
    </div>
  )
}