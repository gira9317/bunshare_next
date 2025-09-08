'use client'

import { useState, useEffect } from 'react'
import { MapPin, MapPinned } from 'lucide-react'
import { ReadingBookmark } from '../types'
import { 
  getReadingBookmarkAction, 
  saveReadingBookmarkAction, 
  deleteReadingBookmarkAction 
} from '../server/actions'
import { cn } from '@/lib/utils'

interface BookmarkFloatingButtonProps {
  workId: string
  isLoggedIn?: boolean
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void
}

export function BookmarkFloatingButton({ 
  workId, 
  isLoggedIn = false,
  onNotification 
}: BookmarkFloatingButtonProps) {
  const [bookmark, setBookmark] = useState<ReadingBookmark | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // しおりデータを取得
  useEffect(() => {
    if (!isLoggedIn) return

    const loadBookmark = async () => {
      const result = await getReadingBookmarkAction(workId)
      if (result.success && result.bookmark) {
        setBookmark(result.bookmark)
      }
    }

    loadBookmark()
  }, [workId, isLoggedIn])

  // 現在のスクロール位置と進捗率を計算
  const calculateProgress = () => {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = documentHeight > 0 ? Math.min((scrollPosition / documentHeight) * 100, 100) : 0
    
    return { scrollPosition: Math.round(scrollPosition), progress: Math.round(progress) }
  }

  // しおり挿入
  const handleInsertBookmark = async () => {
    if (!isLoggedIn) {
      onNotification?.('しおりにはログインが必要です', 'error')
      return
    }

    setIsLoading(true)
    const { scrollPosition, progress } = calculateProgress()
    
    const result = await saveReadingBookmarkAction(workId, scrollPosition, progress)
    
    if (result.success && result.bookmark) {
      setBookmark(result.bookmark)
      onNotification?.('しおりを保存しました！', 'success')
    } else {
      onNotification?.(result.error || 'しおりの保存に失敗しました', 'error')
    }
    
    setIsLoading(false)
  }

  // しおり位置にジャンプ
  const handleJumpToBookmark = () => {
    if (!bookmark) return

    window.scrollTo({
      top: bookmark.scroll_position,
      behavior: 'smooth'
    })
    onNotification?.('しおり位置にジャンプしました', 'info')
  }

  // しおり削除
  const handleDeleteBookmark = async () => {
    if (!bookmark) return

    const confirmed = confirm('しおりを削除しますか？')
    if (!confirmed) return

    setIsLoading(true)
    const result = await deleteReadingBookmarkAction(workId)
    
    if (result.success) {
      setBookmark(null)
      onNotification?.('しおりを削除しました', 'success')
    } else {
      onNotification?.(result.error || 'しおりの削除に失敗しました', 'error')
    }
    
    setIsLoading(false)
  }

  // しおり操作の選択
  const handleBookmarkAction = () => {
    if (!bookmark) {
      handleInsertBookmark()
      return
    }

    const action = confirm(
      'しおりが存在します。\n\n「OK」を押すとしおり位置にジャンプします。\n「キャンセル」を押すとしおりを削除します。'
    )

    if (action) {
      handleJumpToBookmark()
    } else {
      handleDeleteBookmark()
    }
  }

  if (!isLoggedIn) return null

  return (
    <button
      onClick={handleBookmarkAction}
      disabled={isLoading}
      className={cn(
        "fixed bottom-20 right-6 z-50",
        "flex items-center gap-2 px-4 py-3",
        "bg-purple-600 hover:bg-purple-700 text-white",
        "rounded-full shadow-lg hover:shadow-xl",
        "transition-all duration-300 hover:scale-105",
        "text-sm font-medium",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "md:bottom-6 md:px-5 md:py-3"
      )}
      title={bookmark ? 'クリックでしおり位置にジャンプまたは削除' : '現在位置にしおりを作成'}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : bookmark ? (
        <MapPinned className="w-5 h-5" />
      ) : (
        <MapPin className="w-5 h-5" />
      )}
      
      <span className="hidden sm:inline">
        {bookmark ? 'しおり済み' : 'しおり'}
      </span>
    </button>
  )
}