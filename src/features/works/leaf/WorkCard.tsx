'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { WorkCardProps } from '../types'

export function WorkCard({ 
  work, 
  isLiked = false, 
  isBookmarked = false,
  hasReadingProgress = false,
  readingProgress = 0 
}: WorkCardProps) {
  const [liked, setLiked] = useState(isLiked)
  const [bookmarked, setBookmarked] = useState(isBookmarked)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    setLiked(!liked)
    // TODO: Supabase更新処理
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault()
    setBookmarked(!bookmarked)
    // TODO: ブックマークモーダル表示
  }

  const excerpt = work.description?.slice(0, 100) + (work.description && work.description.length > 100 ? '...' : '')

  return (
    <Link href={`/works/${work.id}`}>
      <div className={cn(
        'relative bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700',
        'hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer',
        work.image_url && 'bg-cover bg-center'
      )}
      style={{ backgroundImage: work.image_url ? `url(${work.image_url})` : undefined }}
      >
        {work.image_url && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/10 rounded-lg" />
        )}
        
        <div className="relative z-10">
          {work.series_title && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {work.series_title} {work.episode_number && `第${work.episode_number}話`}
            </div>
          )}

          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className={cn(
                'font-bold text-lg mb-1',
                work.image_url ? 'text-white' : 'text-gray-900 dark:text-white'
              )}>
                {work.title}
              </h3>
              <p className={cn(
                'text-sm',
                work.image_url ? 'text-gray-200' : 'text-gray-600 dark:text-gray-400'
              )}>
                by {work.author}
              </p>
            </div>
          </div>

          <p className={cn(
            'text-sm mb-3 line-clamp-2',
            work.image_url ? 'text-gray-100' : 'text-gray-700 dark:text-gray-300'
          )}>
            {excerpt}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
              <button onClick={handleLike} className="flex items-center gap-1 hover:text-purple-600">
                <span className={cn(liked && 'text-red-500')}>❤</span>
                <span>{work.like_count || 0}</span>
              </button>
              <button onClick={handleBookmark} className="flex items-center gap-1 hover:text-purple-600">
                <span className={cn(bookmarked && 'text-yellow-500')}>🔖</span>
                <span>{work.bookmark_count || 0}</span>
              </button>
              <span className="flex items-center gap-1">
                <span>💬</span>
                <span>{work.comment_count || 0}</span>
              </span>
            </div>
            
            {work.category && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs rounded-full">
                {work.category}
              </span>
            )}
          </div>

          {hasReadingProgress && (
            <div className="mt-2">
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}