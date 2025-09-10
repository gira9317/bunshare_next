'use client'

import { useState } from 'react'
import { WorkCard } from '@/components/domain/WorkCard'
import { SortSelect, type SortOption } from '@/components/ui/SortSelect'
import type { Work } from '@/features/works/types'

interface NovelsEssaysSectionProps {
  works: Work[]
  userLikes?: string[]
  userBookmarks?: string[]
  userReadingProgress?: Record<string, number>
}

const sortOptions: SortOption[] = [
  { value: 'views', label: '人気順' },
  { value: 'created_at', label: '新着順' },
  { value: 'likes', label: 'いいね順' },
  { value: 'comments', label: 'コメント順' }
]

export function NovelsEssaysSection({ 
  works, 
  userLikes = [], 
  userBookmarks = [],
  userReadingProgress = {}
}: NovelsEssaysSectionProps) {
  const [sortBy, setSortBy] = useState('views')
  const [isLoading, setIsLoading] = useState(false)
  const [currentWorks, setCurrentWorks] = useState(works)
  const [displayCount, setDisplayCount] = useState(12)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const handleSortChange = async (newSortBy: string) => {
    if (newSortBy === sortBy || isLoading) return
    
    setIsLoading(true)
    setSortBy(newSortBy)
    
    try {
      const response = await fetch('/api/novels-essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortBy: newSortBy, limit: displayCount })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.works) {
          setCurrentWorks(data.works)
        }
      }
    } catch (error) {
      console.error('並び替えエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreWorks = async () => {
    if (isLoadingMore) return
    
    setIsLoadingMore(true)
    
    try {
      const response = await fetch('/api/novels-essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sortBy, 
          limit: 12,
          offset: currentWorks.length 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.works && data.works.length > 0) {
          setCurrentWorks(prev => [...prev, ...data.works])
          setDisplayCount(prev => prev + 12)
        }
      }
    } catch (error) {
      console.error('追加読み込みエラー:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  if (currentWorks.length === 0) {
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            📚 小説・エッセイ
          </h2>
          <SortSelect
            options={sortOptions}
            value={sortBy}
            onChange={handleSortChange}
          />
        </div>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>まだ小説・エッセイがありません</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          📚 小説・エッセイ
        </h2>
        <SortSelect
          options={sortOptions}
          value={sortBy}
          onChange={handleSortChange}
        />
      </div>
      
      {isLoading && (
        <div className="mb-4 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            並び替え中...
          </div>
        </div>
      )}
      
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-5 xl:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {currentWorks.map((work) => {
          const readingProgress = userReadingProgress[work.work_id]
          return (
            <WorkCard
              key={work.work_id}
              work={work}
              isLiked={userLikes.includes(work.work_id)}
              isBookmarked={userBookmarks.includes(work.work_id)}
              hasReadingProgress={readingProgress > 0}
              readingProgress={readingProgress || 0}
              disableContinueDialog={true}
            />
          )
        })}
      </div>
      
      {/* もっと表示するボタン */}
      <div className="mt-6 text-center">
        <button
          onClick={loadMoreWorks}
          disabled={isLoadingMore}
          className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingMore ? '読み込み中...' : 'もっと表示する'}
        </button>
      </div>
    </section>
  )
}