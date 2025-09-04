'use client'

import { useState, useEffect, useRef } from 'react'
import { useIntersection } from '@/hooks/useIntersection'
import { WorksFeedSection } from '../sections/WorksFeedSection'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { Work } from '@/features/works/types'

interface InfiniteWorksFeedProps {
  initialWorks: Work[]
  initialUserLikes: string[]
  initialUserBookmarks: string[]
  userId?: string
}

export function InfiniteWorksFeed({
  initialWorks,
  initialUserLikes,
  initialUserBookmarks,
  userId
}: InfiniteWorksFeedProps) {
  const [works, setWorks] = useState<Work[]>(initialWorks)
  const [userLikes, setUserLikes] = useState<string[]>(initialUserLikes)
  const [userBookmarks, setUserBookmarks] = useState<string[]>(initialUserBookmarks)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialWorks.length === 6) // 初期表示が6件の場合、追加データがある可能性
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const entry = useIntersection(loadMoreRef, {
    rootMargin: '100px',
  })

  const loadMoreWorks = async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/works?limit=6&offset=${works.length}${userId ? `&userId=${userId}` : ''}`)
      const data = await response.json()
      
      if (data.works && data.works.length > 0) {
        setWorks(prev => [...prev, ...data.works])
        if (userId && data.userLikes && data.userBookmarks) {
          setUserLikes(prev => [...prev, ...data.userLikes])
          setUserBookmarks(prev => [...prev, ...data.userBookmarks])
        }
        
        // 6件未満の場合、これ以上データがないことを示す
        if (data.works.length < 6) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('作品読み込みエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (entry?.isIntersecting) {
      loadMoreWorks()
    }
  }, [entry?.isIntersecting])

  return (
    <div>
      <WorksFeedSection 
        works={works}
        userLikes={userLikes}
        userBookmarks={userBookmarks}
      />
      
      {/* ローディング・読み込みトリガー要素 */}
      <div ref={loadMoreRef} className="py-8">
        {isLoading && (
          <div className="flex justify-center">
            <LoadingSpinner size="sm" text="追加の作品を読み込み中..." />
          </div>
        )}
        
        {!hasMore && works.length > 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            すべての作品を表示しました
          </div>
        )}
        
        {!hasMore && works.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            まだ作品がありません
          </div>
        )}
      </div>
    </div>
  )
}