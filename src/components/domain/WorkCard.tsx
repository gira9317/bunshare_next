'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { WorkCardProps } from '@/features/works/types'
import { toggleLikeAction, incrementViewAction, getReadingProgressAction } from '@/features/works/server/actions'
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth'
import { ShareModal } from './ShareModal'
import { BookmarkModal } from './BookmarkModal'
import { ContinueReadingDialog } from '@/features/works/leaf/ContinueReadingDialog'

export function WorkCard({ 
  work, 
  isLiked = false, 
  isBookmarked = false,
  hasReadingProgress = false,
  readingProgress = 0,
  isManagementMode = false,
  onRemove,
  onMove,
  availableFolders = [],
  disableNavigation = false,
  disableContinueDialog = false
}: WorkCardProps) {
  
  console.log('💳 WorkCard Props:', {
    workId: work.work_id,
    title: work.title,
    hasReadingProgress,
    readingProgress,
    disableContinueDialog,
    disableNavigation
  })
  const [liked, setLiked] = useState(isLiked)
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [isHovered, setIsHovered] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showBookmarkModal, setShowBookmarkModal] = useState(false)
  const [showContinueDialog, setShowContinueDialog] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [currentViews, setCurrentViews] = useState(work.views || 0)
  const [savedReadingProgress, setSavedReadingProgress] = useState<{ percentage: number; position: number } | null>(null)
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { requireAuthAsync } = useRequireAuth()

  // 表示する画像URLを決定
  const displayImageUrl = work.use_series_image && work.series_cover_image_url 
    ? work.series_cover_image_url 
    : work.image_url

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 認証チェック & 楽観的UI更新
    const result = await requireAuthAsync(async () => {
      setLiked(!liked)
      return await toggleLikeAction(work.work_id)
    })
    
    // エラー時は元に戻す
    if (result.error) {
      setLiked(liked)
      if (result.error !== 'ログインが必要です') {
        console.error(result.error)
      }
    }
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMoreMenu(false)
    
    // 認証チェック
    requireAuthAsync(async () => {
      setShowBookmarkModal(true)
      return { success: true }
    })
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMoreMenu(false)
    onRemove?.(work.work_id)
  }

  const handleMoveToFolder = (e: React.MouseEvent, folderKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMoreMenu(false)
    onMove?.(work.work_id, folderKey)
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
    setShowMoreMenu(false)
    setShowShareModal(true)
  }

  // 継続読書ダイアログのハンドラー
  const handleContinueReading = () => {
    setShowContinueDialog(false)
    if (savedReadingProgress) {
      // 読書位置パラメータ付きで遷移
      router.push(`/works/${work.work_id}?continue=true&position=${savedReadingProgress.position}`)
    } else {
      router.push(`/works/${work.work_id}`)
    }
  }

  const handleRestartReading = () => {
    setShowContinueDialog(false)
    router.push(`/works/${work.work_id}?restart=true`)
  }

  const handleCloseContinueDialog = () => {
    setShowContinueDialog(false)
    setSavedReadingProgress(null)
  }

  // Close menu on outside click and ESC key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && 
          !moreMenuButtonRef.current?.contains(event.target as Node) &&
          !dropdownMenuRef.current?.contains(event.target as Node)) {
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
    <>
      <div onClick={(e) => {
        // インタラクティブ要素以外がクリックされた場合のみナビゲーション
        const target = e.target as HTMLElement
        const isButton = target.tagName === 'BUTTON' || target.closest('button')
        const isInteractive = target.closest('.interactive-button, .clickable')
        
        if (!isButton && !isInteractive && !disableNavigation) {
          // 楽観的UI更新で閲覧数をすぐに+1
          setCurrentViews(prev => prev + 1)
          
          // 非同期で閲覧数更新と読書進捗チェック
          startTransition(async () => {
            try {
              // 閲覧数更新
              const viewResult = await incrementViewAction(work.work_id)
              if (viewResult.error) {
                setCurrentViews(prev => prev - 1)
                console.error('閲覧数更新エラー:', viewResult.error)
              } else if (!viewResult.incremented) {
                setCurrentViews(prev => prev - 1)
              }

              // 読書進捗チェック（ログインユーザーのみ、且つダイアログが有効な場合）
              console.log('🔔 Continue Dialog Check:', {
                disableContinueDialog,
                workId: work.work_id,
                hasReadingProgress,
                readingProgress
              })
              
              if (!disableContinueDialog) {
                console.log('🔐 Checking auth and progress...')
                const progressResult = await requireAuthAsync(async () => {
                  console.log('📡 Calling getReadingProgressAction...')
                  return await getReadingProgressAction(work.work_id)
                })

                console.log('📊 Progress Result:', progressResult)

                if (progressResult.success && progressResult.progress && 
                    progressResult.progress.percentage >= 5 && 
                    progressResult.progress.percentage < 100) {
                  // 5%以上100%未満の進捗がある場合、継続読書ダイアログを表示
                  console.log('✅ Showing continue dialog:', {
                    percentage: progressResult.progress.percentage,
                    position: progressResult.progress.position
                  })
                  setSavedReadingProgress({
                    percentage: progressResult.progress.percentage,
                    position: progressResult.progress.position
                  })
                  setShowContinueDialog(true)
                } else {
                  // 進捗がない、または5%未満、100%の場合は直接遷移
                  console.log('➡️  Direct navigation:', {
                    hasProgress: !!progressResult.progress,
                    percentage: progressResult.progress?.percentage,
                    reason: !progressResult.progress ? 'No progress' : 
                           progressResult.progress.percentage < 5 ? 'Less than 5%' : 
                           'More than 100% or other'
                  })
                  router.push(`/works/${work.work_id}`)
                }
              } else {
                // ダイアログ無効の場合は直接遷移
                console.log('🚫 Dialog disabled, direct navigation')
                router.push(`/works/${work.work_id}`)
              }
            } catch (error) {
              setCurrentViews(prev => prev - 1)
              console.error('処理例外:', error)
              // エラー時も遷移
              router.push(`/works/${work.work_id}`)
            }
          })
        }
        
        setShowMoreMenu(false)
      }}>
        <article 
        className={cn(
          'group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700',
          !disableNavigation && 'hover:border-transparent hover:shadow-2xl transition-all duration-500 cursor-pointer',
          !disableNavigation && 'transform hover:-translate-y-1 hover:scale-[1.02]',
          'aspect-[16/9]'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background image with enhanced overlay */}
        {displayImageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={displayImageUrl}
              alt={work.title}
              fill
              className={cn(
                "object-cover",
                !disableNavigation && "transition-transform duration-700 group-hover:scale-110"
              )}
            />
            <div className={cn(
              'absolute inset-0',
              'bg-gradient-to-br from-black/20 to-black/40',
              !disableNavigation && 'transition-all duration-500',
              !disableNavigation && 'group-hover:from-black/60 group-hover:to-black/50'
            )} />
          </div>
        ) : null}

        {/* Content container */}
        <div className="relative z-10 h-full p-3 sm:p-4 md:p-4 lg:p-4 xl:p-4 flex flex-col justify-between">
          {/* Header section */}
          <div className="space-y-1 md:space-y-1.5 lg:space-y-1">
            {work.series_id && work.episode_number ? (
              isManagementMode ? (
                <div className="h-6"></div>
              ) : (
                <div className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full inline-block',
                  'bg-white/20 backdrop-blur-sm',
                  displayImageUrl ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {work.series_title ? `${work.series_title} 第${work.episode_number}話` : `シリーズ 第${work.episode_number}話`}
                </div>
              )
            ) : null}

            <h3 className={cn(
              'font-bold text-sm sm:text-base md:text-lg lg:text-base xl:text-sm leading-tight line-clamp-2',
              'transition-colors duration-300',
              displayImageUrl 
                ? cn('text-white', !disableNavigation && 'group-hover:text-gray-100')
                : cn('text-gray-900 dark:text-white', !disableNavigation && 'group-hover:text-purple-600')
            )}>
              {work.title}
            </h3>
            
            <p className={cn(
              'text-xs sm:text-sm font-medium transition-colors duration-300',
              displayImageUrl 
                ? cn('text-gray-200', !disableNavigation && 'group-hover:text-gray-100')
                : cn('text-gray-600 dark:text-gray-400', !disableNavigation && 'group-hover:text-purple-500')
            )}>
              by {work.author}
            </p>
          </div>

          {/* Description */}
          <p className={cn(
            'text-xs sm:text-sm leading-relaxed line-clamp-2 my-2',
            'transition-all duration-300',
            displayImageUrl 
              ? cn('text-gray-100', !disableNavigation && 'group-hover:text-white')
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
                    <span className="category-tag-brand px-2 py-1 text-xs font-semibold rounded-full">
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
                  displayImageUrl ? 'text-white/80' : 'text-gray-500'
                )}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="icon">
                    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className="font-medium">{currentViews}</span>
                </div>

                {/* Likes */}
                <button 
                  onClick={handleLike} 
                  className={cn(
                    'stat-item interactive-button flex items-center gap-1 text-xs sm:text-sm transition-all duration-300',
                    'hover:scale-110 active:scale-95 clickable',
                    liked 
                      ? 'text-red-500' 
                      : displayImageUrl 
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
                  displayImageUrl ? 'text-white/80' : 'text-gray-500'
                )}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="icon">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className="font-medium">{work.comments || 0}</span>
                </div>

                {/* More Menu Button Only */}
                <button 
                  ref={moreMenuButtonRef}
                  onClick={handleMoreMenu}
                  className={cn(
                    'more-menu-btn interactive-button p-1 rounded transition-all duration-300',
                    'hover:bg-black/10 active:scale-95',
                    displayImageUrl ? 'text-white/80' : 'text-gray-500'
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

        {/* Hover overlay effect */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent',
          'opacity-0 transition-opacity duration-500 pointer-events-none',
          !disableNavigation && 'group-hover:opacity-100'
        )} />
        
        {/* YouTube-style progress bar at bottom */}
        {hasReadingProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 dark:bg-gray-700/50">
            <div 
              className="h-full bg-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        )}
        </article>
      </div>

      {/* Dropdown Menu - Outside Link Component */}
      {showMoreMenu && (
        <div 
          ref={dropdownMenuRef}
          className={cn(
            'fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
            'min-w-[160px] py-1 z-[9999]'
          )}
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {isManagementMode ? (
            <>
              {/* Management Mode Menu */}
              <button
                onClick={handleRemove}
                className={cn(
                  'dropdown-item w-full px-3 py-2 text-sm text-left',
                  'flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20',
                  'transition-colors duration-200 text-red-600 dark:text-red-400'
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>フォルダから削除</span>
              </button>
              
              {availableFolders.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-600 my-1">
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    他のフォルダに移動
                  </div>
                  {availableFolders.map((folder) => (
                    <button
                      key={folder.folder_key}
                      onClick={(e) => handleMoveToFolder(e, folder.folder_key)}
                      className={cn(
                        'dropdown-item w-full px-3 py-2 text-sm text-left',
                        'flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700',
                        'transition-colors duration-200 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
                        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <span>{folder.folder_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Normal Mode Menu */}
              <button
                onClick={(e) => {
                  handleBookmark(e)
                }}
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
                onClick={(e) => {
                  handleShare(e)
                }}
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
            </>
          )}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        workId={work.work_id}
        title={work.title}
        author={work.author}
        description={work.description}
      />

      {/* Bookmark Modal */}
      <BookmarkModal
        isOpen={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        workId={work.work_id}
        title={work.title}
        author={work.author}
      />

      {/* Continue Reading Dialog */}
      {savedReadingProgress && (
        <ContinueReadingDialog
          isOpen={showContinueDialog}
          onClose={handleCloseContinueDialog}
          onContinue={handleContinueReading}
          onRestart={handleRestartReading}
          workTitle={work.title}
          progress={savedReadingProgress.percentage}
        />
      )}
    </>
  )
}