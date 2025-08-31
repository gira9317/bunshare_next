'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { WorkCardProps } from '@/features/works/types'

export function WorkCard({ 
  work, 
  isLiked = false, 
  isBookmarked = false,
  hasReadingProgress = false,
  readingProgress = 0 
}: WorkCardProps) {
  const [liked, setLiked] = useState(isLiked)
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [isHovered, setIsHovered] = useState(false)

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

  const getCategoryGradient = (category: string) => {
    const categoryColors = {
      '小説': 'from-blue-500/80 to-indigo-600/80',
      '詩': 'from-purple-500/80 to-pink-600/80',
      'エッセイ': 'from-green-500/80 to-emerald-600/80',
      '評論': 'from-amber-500/80 to-orange-600/80',
      '短歌': 'from-rose-500/80 to-red-600/80',
      '俳句': 'from-teal-500/80 to-cyan-600/80',
      '戯曲': 'from-violet-500/80 to-purple-600/80',
      'その他': 'from-gray-500/80 to-slate-600/80'
    }
    return categoryColors[category as keyof typeof categoryColors] || categoryColors['その他']
  }

  return (
    <Link href={`/works/${work.work_id}`}>
      <article 
        className={cn(
          'group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700',
          'hover:border-transparent hover:shadow-2xl transition-all duration-500 cursor-pointer',
          'transform hover:-translate-y-1 hover:scale-[1.02]',
          'aspect-[16/9] min-h-[200px] max-h-[280px]'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background image with enhanced overlay */}
        {work.image_url ? (
          <div className="absolute inset-0">
            <Image
              src={work.image_url}
              alt={work.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className={cn(
              'absolute inset-0 transition-all duration-500',
              'bg-gradient-to-br from-transparent to-transparent',
              'group-hover:from-black/60 group-hover:to-black/40'
            )} />
          </div>
        ) : null}

        {/* Content container */}
        <div className="relative z-10 h-full p-4 flex flex-col justify-between">
          {/* Header section */}
          <div className="space-y-2">
            {work.series_title && (
              <div className={cn(
                'text-xs font-medium px-2 py-1 rounded-full inline-block',
                'bg-white/20 backdrop-blur-sm',
                work.image_url ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              )}>
                {work.series_title} {work.episode_number && `第${work.episode_number}話`}
              </div>
            )}

            <h3 className={cn(
              'font-bold text-lg leading-tight line-clamp-2',
              'transition-colors duration-300',
              work.image_url 
                ? 'text-white group-hover:text-gray-100' 
                : 'text-gray-900 dark:text-white group-hover:text-purple-600'
            )}>
              {work.title}
            </h3>
            
            <p className={cn(
              'text-sm font-medium transition-colors duration-300',
              work.image_url 
                ? 'text-gray-200 group-hover:text-gray-100' 
                : 'text-gray-600 dark:text-gray-400 group-hover:text-purple-500'
            )}>
              by {work.author}
            </p>
          </div>

          {/* Description */}
          <p className={cn(
            'text-sm leading-relaxed line-clamp-3 my-3',
            'transition-all duration-300',
            work.image_url 
              ? 'text-gray-100 group-hover:text-white' 
              : 'text-gray-700 dark:text-gray-300'
          )}>
            {excerpt}
          </p>

          {/* Footer section */}
          <div className="space-y-3">
            {/* Stats and category */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-sm">
                <button 
                  onClick={handleLike} 
                  className={cn(
                    'flex items-center gap-1 transition-all duration-300',
                    'hover:scale-110 active:scale-95',
                    liked 
                      ? 'text-red-500' 
                      : work.image_url 
                        ? 'text-white/80 hover:text-red-400' 
                        : 'text-gray-500 hover:text-red-500'
                  )}
                >
                  <span className="text-base">❤</span>
                  <span className="font-medium">{work.likes || 0}</span>
                </button>
                
                <button 
                  onClick={handleBookmark} 
                  className={cn(
                    'flex items-center gap-1 transition-all duration-300',
                    'hover:scale-110 active:scale-95',
                    bookmarked 
                      ? 'text-yellow-500' 
                      : work.image_url 
                        ? 'text-white/80 hover:text-yellow-400' 
                        : 'text-gray-500 hover:text-yellow-500'
                  )}
                >
                  <span className="text-base">🔖</span>
                </button>
                
                <div className={cn(
                  'flex items-center gap-1',
                  work.image_url ? 'text-white/80' : 'text-gray-500'
                )}>
                  <span className="text-base">💬</span>
                  <span className="font-medium">{work.comments || 0}</span>
                </div>
              </div>
              
              {work.category && (
                <span className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-full',
                  'bg-white/90 backdrop-blur-sm text-gray-800',
                  'transition-all duration-300',
                  'group-hover:bg-white group-hover:shadow-lg'
                )}>
                  {work.category}
                </span>
              )}
            </div>

            {/* Reading progress */}
            {hasReadingProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={work.image_url ? 'text-white/80' : 'text-gray-500'}>
                    読書進捗
                  </span>
                  <span className={work.image_url ? 'text-white' : 'text-gray-700'}>
                    {readingProgress}%
                  </span>
                </div>
                <div className="h-2 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all duration-700 ease-out rounded-full',
                      `bg-gradient-to-r ${getCategoryGradient(work.category || 'その他').replace('/80', '')}`
                    )}
                    style={{ width: `${readingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hover overlay effect */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'
        )} />
      </article>
    </Link>
  )
}