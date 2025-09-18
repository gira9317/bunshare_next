'use client'

import { Work } from '../types'
import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getReadingBookmarkAction } from '../server/actions'
import { BookmarkFloatingButton } from '../leaf/BookmarkFloatingButton'
import { TextSelectionPopup } from '../leaf/TextSelectionPopup'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import { ProgressiveWrapper } from '@/components/shared/ProgressiveWrapper'

interface SeriesWork {
  work_id: string
  title: string
  episode_number?: number
}

interface WorkContentEnhancedProps {
  work: Work
  readingProgress: number
  seriesWorks?: SeriesWork[]
  userId?: string
}

/**
 * 拡張コンテンツ - 機能豊富版
 * シリーズナビ、フォント設定、しおり、進捗管理など
 */
export function WorkContentEnhanced({ 
  work, 
  readingProgress: initialProgress,
  seriesWorks = [],
  userId
}: WorkContentEnhancedProps) {
  const [fontSize, setFontSize] = useState('text-base')
  const contentRef = useRef<HTMLDivElement>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showEnhancements, setShowEnhancements] = useState(false)

  // 通知を表示するヘルパー関数
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // useReadingProgressフックを使用（軽量設定）
  const { getCurrentProgress, scrollToPosition } = useReadingProgress({
    workId: work.work_id,
    userId,
    enabled: !!userId,
    autoSaveInterval: 30000, // 30秒間隔で保存（軽量化）
    scrollThreshold: 5 // 5%の変化で保存（頻度削減）
  })

  // 段階的に機能を有効化（初期表示を高速化）
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEnhancements(true)
    }, 1000) // 1秒後に拡張機能を有効化
    
    return () => clearTimeout(timer)
  }, [])

  // URLパラメータから継続読書の処理を行う（遅延実行）
  useEffect(() => {
    if (!showEnhancements) return

    const timer = setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search)
      const shouldContinue = urlParams.get('continue') === 'true'
      const position = urlParams.get('position')
      const shouldRestart = urlParams.get('restart') === 'true'

      if (shouldContinue && position) {
        const targetPosition = parseInt(position)
        setTimeout(() => {
          scrollToPosition(targetPosition)
          showNotification('前回の続きから読み始めます', 'info')
        }, 500)
      } else if (shouldRestart) {
        showNotification('最初から読み始めます', 'info')
      }

      // URLパラメータをクリーンアップ
      if (shouldContinue || shouldRestart) {
        const url = new URL(window.location.href)
        url.searchParams.delete('continue')
        url.searchParams.delete('position')
        url.searchParams.delete('restart')
        window.history.replaceState({}, '', url.toString())
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [scrollToPosition, showNotification, showEnhancements])

  // しおり自動復帰機能（段階的読み込み）
  useEffect(() => {
    if (!userId || !showEnhancements) return

    const checkBookmarkAutoReturn = async () => {
      try {
        const result = await getReadingBookmarkAction(work.work_id)
        if (result.success && result.bookmark && result.bookmark.scroll_position > 0) {
          const shouldJump = confirm(
            `前回の続きから読みますか？\n\n読書進捗: ${Math.round(result.bookmark.reading_progress)}%`
          )
          
          if (shouldJump) {
            setTimeout(() => {
              window.scrollTo({
                top: result.bookmark.scroll_position,
                behavior: 'smooth'
              })
              showNotification('しおり位置から再開しました', 'info')
            }, 500)
          }
        }
      } catch (error) {
        console.error('しおり自動復帰エラー:', error)
      }
    }

    const timer = setTimeout(checkBookmarkAutoReturn, 1500)
    return () => clearTimeout(timer)
  }, [work.work_id, userId, showEnhancements])

  // シリーズナビゲーション
  const currentEpisodeIndex = seriesWorks.findIndex(w => w.work_id === work.work_id)
  const prevEpisode = currentEpisodeIndex > 0 ? seriesWorks[currentEpisodeIndex - 1] : null
  const nextEpisode = currentEpisodeIndex < seriesWorks.length - 1 ? seriesWorks[currentEpisodeIndex + 1] : null

  // フォントサイズ設定
  const fontSizes = [
    { label: '小', value: 'text-sm' },
    { label: '中', value: 'text-base' },
    { label: '大', value: 'text-lg' },
    { label: '特大', value: 'text-xl' }
  ]

  return (
    <div className="space-y-6">
      {/* シリーズナビゲーション - 段階的表示 */}
      {showEnhancements && seriesWorks.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {prevEpisode ? (
              <a
                href={`/app/works/${prevEpisode.work_id}`}
                className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>前話: {prevEpisode.title}</span>
              </a>
            ) : (
              <span className="text-sm text-gray-400">最初の話</span>
            )}
          </div>
          
          <span className="text-sm font-semibold text-gray-700">
            第{work.episode_number || 1}話
          </span>
          
          <div className="flex items-center gap-2">
            {nextEpisode ? (
              <a
                href={`/app/works/${nextEpisode.work_id}`}
                className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
              >
                <span>次話: {nextEpisode.title}</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            ) : (
              <span className="text-sm text-gray-400">最新話</span>
            )}
          </div>
        </div>
      )}

      {/* フォントサイズ設定 - 段階的表示 */}
      {showEnhancements && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-600">文字サイズ:</span>
          <div className="flex gap-1">
            {fontSizes.map(size => (
              <button
                key={size.value}
                onClick={() => setFontSize(size.value)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  fontSize === size.value
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-50"
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 本文 - 動的フォントサイズ適用 */}
      <div
        ref={contentRef}
        className="prose prose-gray max-w-none work-content-container"
      >
        <div 
          id="main-content-text"
          className={cn(
            "whitespace-pre-wrap leading-relaxed work-content",
            showEnhancements ? fontSize : 'text-base',
            "text-gray-800",
          )}
          dangerouslySetInnerHTML={{ 
            __html: work.content?.replace(/\n/g, '<br />') || '' 
          }}
        />
      </div>

      {/* 🔄 段階的ハイドレーション: 重い機能を遅延読み込み */}
      <ProgressiveWrapper
        config={{
          delayMs: 3000, // 3秒後に有効化
          enableOnInteraction: true // ユーザー操作で即座に有効化
        }}
        fallback={null}
      >
        {showEnhancements && (
          <>
            <BookmarkFloatingButton
              workId={work.work_id}
              isLoggedIn={!!userId}
              onNotification={showNotification}
            />

            <TextSelectionPopup
              workId={work.work_id}
              isLoggedIn={!!userId}
              onNotification={showNotification}
            />
          </>
        )}
      </ProgressiveWrapper>

      {/* 通知 - 常に有効（軽量） */}
      {notification && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300",
            "max-w-sm text-sm font-medium",
            notification.type === 'success' && "bg-green-500 text-white",
            notification.type === 'error' && "bg-red-500 text-white",
            notification.type === 'info' && "bg-blue-500 text-white"
          )}
        >
          {notification.message}
        </div>
      )}
    </div>
  )
}