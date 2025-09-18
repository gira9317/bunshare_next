'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, X } from 'lucide-react'
import { saveReadingBookmarkAction } from '../server/actions'
import { cn } from '@/lib/utils'

interface TextSelectionPopupProps {
  workId: string
  isLoggedIn?: boolean
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void
}

export function TextSelectionPopup({ 
  workId, 
  isLoggedIn = false,
  onNotification 
}: TextSelectionPopupProps) {
  const [selectedText, setSelectedText] = useState('')
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [showPopup, setShowPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoggedIn) return

    const handleSelection = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      
      if (text && text.length > 0 && text.length <= 200) {
        const range = selection?.getRangeAt(0)
        if (range) {
          const rect = range.getBoundingClientRect()
          const scrollY = window.pageYOffset || document.documentElement.scrollTop
          
          setSelectedText(text)
          setPopupPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + scrollY + 8
          })
          setShowPopup(true)
        }
      } else {
        setShowPopup(false)
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false)
      }
    }

    // テキスト選択イベントをリッスン
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('touchend', handleSelection)
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('touchend', handleSelection)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isLoggedIn])

  // 選択されたテキストでしおりを挿入
  const handleInsertBookmarkWithText = async () => {
    if (!selectedText) return

    setIsLoading(true)
    
    // 現在のスクロール位置と進捗率を計算
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = documentHeight > 0 ? Math.min((scrollPosition / documentHeight) * 100, 100) : 0
    
    const result = await saveReadingBookmarkAction(
      workId, 
      Math.round(scrollPosition), 
      Math.round(progress),
      selectedText
    )
    
    if (result.success) {
      onNotification?.('選択したテキストと一緒にしおりを保存しました！', 'success')
      setShowPopup(false)
      
      // テキスト選択を解除
      window.getSelection()?.removeAllRanges()
    } else {
      onNotification?.(result.error || 'しおりの保存に失敗しました', 'error')
    }
    
    setIsLoading(false)
  }

  const handleClose = () => {
    setShowPopup(false)
    window.getSelection()?.removeAllRanges()
  }

  if (!isLoggedIn || !showPopup) return null

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 max-w-80"
      style={{
        left: Math.max(8, Math.min(popupPosition.x - 128, window.innerWidth - 320 - 8)),
        top: popupPosition.y,
        transform: popupPosition.y > window.innerHeight * 0.7 ? 'translateY(-100%) translateY(-8px)' : undefined
      }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-900">
            テキスト選択
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 text-gray-400 hovertext-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 選択されたテキスト */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700 max-h-20 overflow-y-auto">
        "{selectedText}"
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={handleInsertBookmarkWithText}
          disabled={isLoading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2",
            "bg-purple-600 hover:bg-purple-700 text-white",
            "rounded-md transition-colors text-sm font-medium",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              しおりを挿入
            </>
          )}
        </button>
        
        <button
          onClick={handleClose}
          className="px-3 py-2 text-gray-600 hovertext-gray-100 transition-colors text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}