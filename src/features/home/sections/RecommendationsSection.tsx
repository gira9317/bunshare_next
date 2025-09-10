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
  const { works: initialWorks, strategy, source } = recommendations
  const [allWorks, setAllWorks] = useState(initialWorks) // 全ての作品を管理
  const [displayCount, setDisplayCount] = useState(9) // 初期表示は9件
  const [isLoading, setIsLoading] = useState(false)
  const [hasMoreAvailable, setHasMoreAvailable] = useState(true) // 追加データが存在する可能性
  
  const hasMore = allWorks.length > displayCount || hasMoreAvailable
  const displayedWorks = allWorks.slice(0, displayCount)
  
  // 追加の推薦を取得する関数
  const loadMoreRecommendations = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/recommendations/more', {
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
        }
        // APIから「もうデータがない」情報を受け取った場合
        if (!data.hasMore || data.works.length === 0) {
          setHasMoreAvailable(false)
        }
      }
    } catch (error) {
      console.error('追加推薦の取得に失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (allWorks.length === 0) {
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
            onClick={async () => {
              // 現在のデータ内で表示できる場合
              if (displayCount + 9 <= allWorks.length) {
                setDisplayCount(prev => prev + 9)
              } else {
                // 追加データが必要な場合
                await loadMoreRecommendations()
                setDisplayCount(prev => prev + 9)
              }
            }}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '読み込み中...' : 'もっと表示する'}
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