'use client'

import { UserWork } from '../schemas'
import { WorkCard } from '@/components/domain/WorkCard'
import { cn } from '@/lib/utils'

interface UserWorksSectionProps {
  works: UserWork[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}

export function UserWorksSection({ 
  works, 
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className 
}: UserWorksSectionProps) {
  if (works.length === 0 && !isLoading) {
    return (
      <div className={cn('bg-white border border-gray-200 rounded-xl p-8', className)}>
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            まだ作品がありません
          </h3>
          <p className="text-gray-600">
            このユーザーはまだ作品を投稿していません。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          作品一覧
        </h2>
        <span className="text-sm text-gray-600">
          {works.length}作品
        </span>
      </div>

      {/* Works Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {works.map((work) => (
          <WorkCard
            key={work.work_id}
            work={{
              work_id: work.work_id,
              title: work.title,
              description: work.description,
              category: work.category,
              author: 'あなた',
              likes: work.likes_count,
              comments: work.comments_count,
              views: work.views_count,
              created_at: work.created_at,
              image_url: undefined
            }}
            isLiked={false}
            isBookmarked={false}
            disableContinueDialog={true}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Loading...' : 'もっと見る'}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && works.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-100 rounded-xl h-48"
            />
          ))}
        </div>
      )}
    </div>
  )
}