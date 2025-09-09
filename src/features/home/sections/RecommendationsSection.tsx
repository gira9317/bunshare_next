'use client'

import { useState } from 'react'
import { WorkCard } from '@/components/domain/WorkCard'
import { RecommendationSourceBadge } from '../leaf/RecommendationSourceBadge'
import { TrackedWorkCard } from '@/components/domain/TrackedWorkCard'
import type { Work } from '@/features/works/types'
import type { RecommendationResult } from '../types'

interface RecommendationsSectionProps {
  recommendations: RecommendationResult
  userLikes?: string[]
  userBookmarks?: string[]
  userReadingProgress?: Record<string, number>
}

export function RecommendationsSection({ 
  recommendations,
  userLikes = [], 
  userBookmarks = [],
  userReadingProgress = {}
}: RecommendationsSectionProps) {
  const { works, strategy, source } = recommendations
  const [displayCount, setDisplayCount] = useState(9) // 初期表示は9件
  
  const hasMore = works.length > displayCount
  const displayedWorks = works.slice(0, displayCount)

  if (works.length === 0) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            あなたへのおすすめ
          </h2>
          <RecommendationSourceBadge source={source} strategy={strategy} />
        </div>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>まだおすすめできる作品がありません</p>
          <p className="text-sm mt-2">作品を読んだりいいねすると、より良いおすすめを表示します</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          あなたへのおすすめ
        </h2>
        <RecommendationSourceBadge source={source} strategy={strategy} />
      </div>
      
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-5 xl:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {displayedWorks.map((work, index) => {
          const readingProgress = userReadingProgress[work.work_id]
          return (
            <TrackedWorkCard
              key={work.work_id}
              work={work}
              isLiked={userLikes.includes(work.work_id)}
              isBookmarked={userBookmarks.includes(work.work_id)}
              hasReadingProgress={readingProgress > 0}
              readingProgress={readingProgress || 0}
              disableContinueDialog={true}
              impressionContext={{
                impressionType: 'recommendation',
                pageContext: 'home',
                position: index + 1
              }}
            />
          )
        })}
      </div>
      
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setDisplayCount(prev => Math.min(prev + 9, works.length))}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            もっと表示する ({works.length - displayCount}件)
          </button>
        </div>
      )}
      
      {strategy === 'popular' && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          💡 作品にいいねやブックマークをすると、より個人的なおすすめを表示します
        </div>
      )}
    </section>
  )
}