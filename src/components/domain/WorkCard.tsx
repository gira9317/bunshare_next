'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null)

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

  const handleMoreMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!showMoreMenu && moreMenuButtonRef.current) {
      const rect = moreMenuButtonRef.current.getBoundingClientRect()
      const menuWidth = 160
      const menuHeight = 80
      
      // Calculate position with viewport boundaries
      let x = rect.right - menuWidth
      let y = rect.bottom + 8
      
      // Adjust if menu would go off-screen
      if (x < 8) x = 8
      if (x + menuWidth > window.innerWidth - 8) x = window.innerWidth - menuWidth - 8
      if (y + menuHeight > window.innerHeight - 8) y = rect.top - menuHeight - 8
      
      setMenuPosition({ x, y })
    }
    
    setShowMoreMenu(!showMoreMenu)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // TODO: シェア機能実装
    console.log('Share work:', work.work_id)
    setShowMoreMenu(false)
  }

  // Close menu on outside click and ESC key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !moreMenuButtonRef.current?.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showMoreMenu) {
        setShowMoreMenu(false)
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [showMoreMenu])

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
          'aspect-[16/9]'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setShowMoreMenu(false)}
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
              'bg-gradient-to-br from-black/20 to-black/40',
              'group-hover:from-black/60 group-hover:to-black/50'
            )} />
          </div>
        ) : null}

        {/* Content container */}
        <div className="relative z-10 h-full p-3 sm:p-4 md:p-4 lg:p-4 xl:p-4 flex flex-col justify-between">
          {/* Header section */}
          <div className="space-y-1 md:space-y-1.5 lg:space-y-1">
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
              'font-bold text-sm sm:text-base md:text-lg lg:text-base xl:text-sm leading-tight line-clamp-2',
              'transition-colors duration-300',
              work.image_url 
                ? 'text-white group-hover:text-gray-100' 
                : 'text-gray-900 dark:text-white group-hover:text-purple-600'
            )}>
              {work.title}
            </h3>
            
            <p className={cn(
              'text-xs sm:text-sm font-medium transition-colors duration-300',
              work.image_url 
                ? 'text-gray-200 group-hover:text-gray-100' 
                : 'text-gray-600 dark:text-gray-400 group-hover:text-purple-500'
            )}>
              by {work.author}
            </p>
          </div>

          {/* Description */}
          <p className={cn(
            'text-xs sm:text-sm leading-relaxed line-clamp-2 my-2',
            'transition-all duration-300',
            work.image_url 
              ? 'text-gray-100 group-hover:text-white' 
              : 'text-gray-700 dark:text-gray-300'
          )}>
            {excerpt}
          </p>

          {/* Work Meta Section */}
          <div className="work-meta">
            <div className="work-stats flex justify-between items-center">
              {/* Left side - Category */}
              <div className="stat-group-left">
                {work.category && (
                  <div className="work-category">
                    <span className={cn(
                      'category-tag px-2 py-1 text-xs font-semibold rounded-full',
                      'bg-white/90 backdrop-blur-sm text-gray-800',
                      'transition-all duration-300',
                      'group-hover:bg-white group-hover:shadow-lg'
                    )}>
                      {work.category}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Right side - Stats */}
              <div className="stat-group-right flex items-center gap-2 sm:gap-3">
                {/* Views */}
                <div className={cn(
                  'stat-item flex items-center gap-1 text-xs sm:text-sm',
                  work.image_url ? 'text-white/80' : 'text-gray-500'
                )}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="icon">
                    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className="font-medium">{work.views || 0}</span>
                </div>

                {/* Likes */}
                <button 
                  onClick={handleLike} 
                  className={cn(
                    'stat-item flex items-center gap-1 text-xs sm:text-sm transition-all duration-300',
                    'hover:scale-110 active:scale-95 clickable',
                    liked 
                      ? 'text-red-500' 
                      : work.image_url 
                        ? 'text-white/80 hover:text-red-400' 
                        : 'text-gray-500 hover:text-red-500'
                  )}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} className="icon">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className="font-medium">{work.likes || 0}</span>
                </button>

                {/* Comments */}
                <div className={cn(
                  'stat-item flex items-center gap-1 text-xs sm:text-sm',
                  work.image_url ? 'text-white/80' : 'text-gray-500'
                )}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="icon">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className="font-medium">{work.comments || 0}</span>
                </div>

                {/* More Menu */}
                <div className="more-menu-container relative">
                  <button 
                    ref={moreMenuButtonRef}
                    onClick={handleMoreMenu}
                    className={cn(
                      'more-menu-btn p-1 rounded transition-all duration-300',
                      'hover:bg-black/10 active:scale-95',
                      work.image_url ? 'text-white/80' : 'text-gray-500'
                    )}
                    title="その他のオプション"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="more-menu-icon">
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>

                </div>
              </div>
            </div>
          </div>

          {/* Reading progress */}
          {hasReadingProgress && (
            <div className="space-y-1 mt-3">
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

        {/* Hover overlay effect */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none'
        )} />
      </article>

      {/* Portal-rendered dropdown menu */}
      {showMoreMenu && typeof window !== 'undefined' && createPortal(
        <div 
          className={cn(
            'more-menu-dropdown fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
            'min-w-[160px] py-1 z-[9999]',
            'animate-in slide-in-from-top-2 duration-200'
          )}
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
          }}
        >
          <button
            onClick={handleBookmark}
            className={cn(
              'dropdown-item w-full px-3 py-2 text-sm text-left',
              'flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-200',
              bookmarked ? 'text-yellow-600' : 'text-gray-700 dark:text-gray-300'
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>{bookmarked ? 'ブックマーク済み' : 'ブックマーク'}</span>
          </button>
          
          <button
            onClick={handleShare}
            className={cn(
              'dropdown-item w-full px-3 py-2 text-sm text-left',
              'flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors duration-200 text-gray-700 dark:text-gray-300'
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="currentColor" strokeWidth="2"/>
              <polyline points="16,6 12,2 8,6" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="2" x2="12" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>シェア</span>
          </button>
        </div>,
        document.body
      )}
    </Link>
  )
}