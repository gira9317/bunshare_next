'use client'

import { Work } from '../types'
import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateReadingProgressAction } from '../server/actions'

interface SeriesWork {
  work_id: string
  title: string
  episode_number?: number
}

interface WorkDetailContentSectionProps {
  work: Work
  readingProgress: number
  seriesWorks?: SeriesWork[]
}

export function WorkDetailContentSection({ 
  work, 
  readingProgress: initialProgress,
  seriesWorks = []
}: WorkDetailContentSectionProps) {
  const [progress, setProgress] = useState(initialProgress)
  const [fontSize, setFontSize] = useState('text-base')
  const contentRef = useRef<HTMLDivElement>(null)
  const [isTracking, setIsTracking] = useState(false)

  // シリーズナビゲーション
  const currentEpisodeIndex = seriesWorks.findIndex(w => w.work_id === work.work_id)
  const prevEpisode = currentEpisodeIndex > 0 ? seriesWorks[currentEpisodeIndex - 1] : null
  const nextEpisode = currentEpisodeIndex < seriesWorks.length - 1 ? seriesWorks[currentEpisodeIndex + 1] : null

  // 読書進捗を追跡
  useEffect(() => {
    if (!contentRef.current) return

    let timeoutId: NodeJS.Timeout
    
    const handleScroll = () => {
      if (!contentRef.current) return
      
      const element = contentRef.current
      const scrollTop = element.scrollTop
      const scrollHeight = element.scrollHeight - element.clientHeight
      const scrollProgress = Math.min(Math.round((scrollTop / scrollHeight) * 100), 100)
      
      setProgress(scrollProgress)
      
      // デバウンス処理（スクロールが止まってから保存）
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (scrollProgress > initialProgress) {
          updateReadingProgressAction(work.work_id, scrollProgress)
            .catch(err => console.error('進捗保存エラー:', err))
        }
      }, 1000)
    }

    const element = contentRef.current
    element.addEventListener('scroll', handleScroll, { passive: true })
    setIsTracking(true)

    // 初期位置への復元
    if (initialProgress > 0 && element) {
      const scrollHeight = element.scrollHeight - element.clientHeight
      const targetScroll = (initialProgress / 100) * scrollHeight
      element.scrollTop = targetScroll
    }

    return () => {
      element.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [work.work_id, initialProgress])

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

      {/* 読書進捗バー */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-2 -mx-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">読書進捗</span>
          <span className="text-xs font-semibold text-purple-600">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

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
        className="prose prose-gray dark:prose-invert max-w-none overflow-y-auto"
        style={{ maxHeight: '70vh' }}
      >
        <div 
          className={cn(
            "whitespace-pre-wrap leading-relaxed",
            fontSize,
            "text-gray-800 dark:text-gray-200"
          )}
          dangerouslySetInnerHTML={{ 
            __html: work.content?.replace(/\n/g, '<br />') || '' 
          }}
        />
      </div>

      {/* 読了メッセージ */}
      {progress === 100 && (
        <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl text-center space-y-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            🎉 読了おめでとうございます！
          </p>
          
          {nextEpisode && (
            <a
              href={`/works/${nextEpisode.work_id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              次の話を読む
              <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}