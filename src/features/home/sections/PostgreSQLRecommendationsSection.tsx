'use client'

import { useState } from 'react'
import { WorkCard } from '@/components/domain/WorkCard'
import { RecommendationSourceBadge } from '../leaf/RecommendationSourceBadge'
import { TrackedWorkCard } from '@/components/domain/TrackedWorkCard'
import type { Work } from '@/features/works/types'
import type { RecommendationResult } from '../types'

interface PostgreSQLRecommendationsSectionProps {
  recommendations: RecommendationResult
  userLikes?: string[]
  userBookmarks?: string[]
  userReadingProgress?: Record<string, number>
  title?: string
}

export function PostgreSQLRecommendationsSection({ 
  recommendations,
  userLikes = [], 
  userBookmarks = [],
  userReadingProgress = {},
  title
}: PostgreSQLRecommendationsSectionProps) {
  const { works: initialWorks, strategy, source } = recommendations
  const [allWorks, setAllWorks] = useState(initialWorks) // 全ての作品を管理
  const [displayCount, setDisplayCount] = useState(9) // 初期表示は9件
  const [isLoading, setIsLoading] = useState(false)
  const [hasMoreAvailable, setHasMoreAvailable] = useState(true) // 追加データが存在する可能性
  
  const hasMore = allWorks.length > displayCount || hasMoreAvailable
  const displayedWorks = allWorks.slice(0, displayCount)
  
  // PostgreSQL推薦システム用の追加取得関数
  const loadMoreRecommendations = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/recommendations/postgresql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludeWorkIds: allWorks.map(work => work.work_id),
          offset: allWorks.length
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.works && data.works.length > 0) {
          setAllWorks(prev => [...prev, ...data.works])
        } else {
          setHasMoreAvailable(false) // これ以上取得できない
        }
      } else {
        console.error('PostgreSQL追加推薦取得失敗:', response.status)
        setHasMoreAvailable(false)
      }
    } catch (error) {
      console.error('PostgreSQL追加推薦取得エラー:', error)
      setHasMoreAvailable(false)
    }
    setIsLoading(false)
  }

  const showMoreWorks = () => {
    if (allWorks.length > displayCount) {
      // 既存の作品から表示数を増加
      setDisplayCount(prev => Math.min(prev + 9, allWorks.length))
    } else if (hasMoreAvailable) {
      // 新しい作品を取得
      loadMoreRecommendations()
    }
  }

  if (allWorks.length === 0) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {title || 'あなたへのおすすめ'}
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
          {title || 'あなたへのおすすめ'}
        </h2>
        <RecommendationSourceBadge source={source} strategy={strategy} />
      </div>
      
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-5 xl:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {displayedWorks.map((work, index) => {
          const isLiked = userLikes.includes(work.work_id)
          const isBookmarked = userBookmarks.includes(work.work_id)
          const readingProgress = userReadingProgress[work.work_id] || 0
          
          return (
            <TrackedWorkCard
              key={`${work.work_id}-${index}`}
              work={work as Work}
              isLiked={isLiked}
              isBookmarked={isBookmarked}
              readingProgress={readingProgress}
              priority={index < 3}
              trackingContext={{
                impressionType: 'recommendation',
                pageContext: 'home',
                position: index,
                additionalData: {
                  strategy,
                  source,
                  section: 'postgresql_recommendations'
                }
              }}
            />
          )
        })}
      </div>
      
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={showMoreWorks}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '読み込み中...' : 'もっと表示する'}
          </button>
        </div>
      )}
    </section>
  )
}