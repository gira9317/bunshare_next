'use client'

import { useState } from 'react'
import { WorkCard } from '@/components/domain/WorkCard'
import { SortSelect, type SortOption } from '@/components/ui/SortSelect'
import { TagBadge } from '../leaf/TagBadge'
import type { Work } from '@/features/works/types'
import type { TagWorksGroup } from '../server/userTagsLoader'

interface UserTagsSectionProps {
  tagGroups: TagWorksGroup[]
  isWarm: boolean
  userLikes?: string[]
  userBookmarks?: string[]
  userReadingProgress?: Record<string, number>
}

const sortOptions: SortOption[] = [
  { value: 'views_all', label: '総視聴回数' },
  { value: 'views_month', label: '今月の人気順' },
  { value: 'views_week', label: '今週の人気順' },
  { value: 'views_day', label: '今日の人気順' },
  { value: 'created_at', label: '新着順' }
]

export function UserTagsSection({ 
  tagGroups,
  isWarm,
  userLikes = [], 
  userBookmarks = [],
  userReadingProgress = {}
}: UserTagsSectionProps) {
  const [sortBy, setSortBy] = useState('views_all')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTagGroups, setCurrentTagGroups] = useState(tagGroups)
  const [showMore, setShowMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const handleSortChange = async (newSortBy: string) => {
    if (newSortBy === sortBy || isLoading) return
    
    setIsLoading(true)
    setSortBy(newSortBy)
    
    try {
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortBy: newSortBy })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.tagGroups) {
          setCurrentTagGroups(data.tagGroups)
          setShowMore(false)
        }
      }
    } catch (error) {
      console.error('並び替えエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreTags = async () => {
    if (isLoadingMore) return
    
    setIsLoadingMore(true)
    
    try {
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sortBy,
          limit: 15, // より多くのタグを取得
          offset: currentTagGroups.length
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.tagGroups && data.tagGroups.length > 0) {
          setCurrentTagGroups(prev => [...prev, ...data.tagGroups])
        }
        setShowMore(true)
      }
    } catch (error) {
      console.error('追加読み込みエラー:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  if (currentTagGroups.length === 0) {
    return null // セクションを非表示
  }

  const sectionTitle = isWarm ? "あなたの好みから" : "人気のタグから"
  const allWorks = currentTagGroups.flatMap(group => group.works)
  const displayedGroups = showMore ? currentTagGroups : currentTagGroups.slice(0, 3)

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {sectionTitle}
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
      
      <div className="space-y-8">
        {displayedGroups.map((group) => (
          <div key={group.tag} className="space-y-4">
            <div className="flex items-center gap-2">
              <TagBadge tag={group.tag} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                からの作品
              </span>
            </div>
            
            <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-5 xl:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {group.works.map((work) => {
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
          </div>
        ))}
      </div>
      
      {/* もっと表示するボタン */}
      {!showMore && currentTagGroups.length > 3 && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMoreTags}
            disabled={isLoadingMore}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? '読み込み中...' : 'もっと表示する'}
          </button>
        </div>
      )}
      
      {/* 個人化ヒント（コールドユーザーのみ） */}
      {!isWarm && (
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          💡 作品にいいねやブックマークをすると、より個人的なおすすめを表示します
        </div>
      )}
    </section>
  )
}