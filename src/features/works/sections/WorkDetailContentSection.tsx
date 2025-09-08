'use client'

import { Work } from '../types'
import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getReadingBookmarkAction } from '../server/actions'
import { BookmarkFloatingButton } from '../leaf/BookmarkFloatingButton'
import { TextSelectionPopup } from '../leaf/TextSelectionPopup'
import { useReadingProgress } from '@/hooks/useReadingProgress'

interface SeriesWork {
  work_id: string
  title: string
  episode_number?: number
}

interface WorkDetailContentSectionProps {
  work: Work
  readingProgress: number
  seriesWorks?: SeriesWork[]
  userId?: string
}

export function WorkDetailContentSection({ 
  work, 
  readingProgress: initialProgress,
  seriesWorks = [],
  userId
}: WorkDetailContentSectionProps) {
  const [fontSize, setFontSize] = useState('text-base')
  const contentRef = useRef<HTMLDivElement>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // 通知を表示するヘルパー関数
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // useReadingProgressフックを使用（本文コンテンツのみで進捗計算）
  const { getCurrentProgress, scrollToPosition } = useReadingProgress({
    workId: work.work_id,
    userId,
    enabled: !!userId,
    contentSelector: '#main-content-text'
  })

  // デバッグ用：複数のセレクターで本文要素を確認
  useEffect(() => {
    const checkContentElements = () => {
      const selectors = [
        '#main-content-text',
        '.work-content',
        '.work-content-container',
        '.prose'
      ]
      
      console.log('🎯 Content Elements Debug:')
      selectors.forEach(selector => {
        const element = document.querySelector(selector)
        console.log(`  ${selector}:`)
        console.log(`    Found: ${!!element}`)
        if (element) {
          const rect = element.getBoundingClientRect()
          console.log(`    Position: top=${rect.top.toFixed(1)}px, height=${rect.height.toFixed(1)}px`)
          console.log(`    Scroll height: ${element.scrollHeight}px`)
          console.log(`    Content preview: "${element.textContent?.substring(0, 50)}..."`)
        }
      })
      
      // ページ全体の情報
      console.log('📄 Page Info:')
      console.log(`  Document height: ${document.documentElement.scrollHeight}px`)
      console.log(`  Window height: ${window.innerHeight}px`)
      console.log(`  Current scroll: ${window.scrollY}px`)
    }
    
    // DOMが構築された後にチェック
    setTimeout(checkContentElements, 1000)
  }, [work.work_id])

  // URLパラメータから継続読書の処理を行う
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shouldContinue = urlParams.get('continue') === 'true'
    const position = urlParams.get('position')
    const shouldRestart = urlParams.get('restart') === 'true'

    if (shouldContinue && position) {
      // 少し遅らせてからスクロール（レンダリング完了後）
      setTimeout(() => {
        scrollToPosition(parseInt(position))
        showNotification('前回の続きから読み始めます', 'info')
      }, 1000)
    } else if (shouldRestart) {
      // 最初からの場合は特に何もしない（デフォルトでトップ）
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
  }, [scrollToPosition, showNotification])

  // しおり自動復帰機能
  useEffect(() => {
    if (!userId) return

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

    // ページ読み込み後少し待ってから実行
    const timer = setTimeout(checkBookmarkAutoReturn, 1000)
    return () => clearTimeout(timer)
  }, [work.work_id, userId])

  // シリーズナビゲーション
  const currentEpisodeIndex = seriesWorks.findIndex(w => w.work_id === work.work_id)
  const prevEpisode = currentEpisodeIndex > 0 ? seriesWorks[currentEpisodeIndex - 1] : null
  const nextEpisode = currentEpisodeIndex < seriesWorks.length - 1 ? seriesWorks[currentEpisodeIndex + 1] : null

  // 読書進捗はuseReadingProgressフックで自動処理されるため、ここでは不要

  // フォントサイズ設定
  const fontSizes = [
    { label: '小', value: 'text-sm' },
    { label: '中', value: 'text-base' },
    { label: '大', value: 'text-lg' },
    { label: '特大', value: 'text-xl' }
  ]

  return (
    <div className="space-y-6">
      {/* シリーズナビゲーション */}
      {seriesWorks.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            {prevEpisode ? (
              <a
                href={`/works/${prevEpisode.work_id}`}
                className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>前話: {prevEpisode.title}</span>
              </a>
            ) : (
              <span className="text-sm text-gray-400">最初の話</span>
            )}
          </div>
          
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            第{work.episode_number || 1}話
          </span>
          
          <div className="flex items-center gap-2">
            {nextEpisode ? (
              <a
                href={`/works/${nextEpisode.work_id}`}
                className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:underline"
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


      {/* フォントサイズ設定 */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">文字サイズ:</span>
        <div className="flex gap-1">
          {fontSizes.map(size => (
            <button
              key={size.value}
              onClick={() => setFontSize(size.value)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                fontSize === size.value
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* 本文 */}
      <div
        ref={contentRef}
        className="prose prose-gray dark:prose-invert max-w-none work-content-container"
      >
        <div 
          id="main-content-text"
          className={cn(
            "whitespace-pre-wrap leading-relaxed work-content",
            fontSize,
            "text-gray-800 dark:text-gray-200",
            // デバッグ用の視覚的ボーダー（開発環境のみ）
            process.env.NODE_ENV === 'development' && "border-2 border-dashed border-red-300 p-4"
          )}
          dangerouslySetInnerHTML={{ 
            __html: work.content?.replace(/\n/g, '<br />') || '' 
          }}
        />
      </div>


      {/* しおり機能 */}
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

      {/* 通知 */}
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