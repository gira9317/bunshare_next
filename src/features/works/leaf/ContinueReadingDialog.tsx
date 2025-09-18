'use client'

import { useState } from 'react'
import { BookOpen, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContinueReadingDialogProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
  onRestart: () => void
  workTitle: string
  progress: number
}

export function ContinueReadingDialog({
  isOpen,
  onClose,
  onContinue,
  onRestart,
  workTitle,
  progress
}: ContinueReadingDialogProps) {
  const [isLoading, setIsLoading] = useState<'continue' | 'restart' | null>(null)

  if (!isOpen) return null

  const handleContinue = async () => {
    setIsLoading('continue')
    try {
      await onContinue()
    } finally {
      setIsLoading(null)
    }
  }

  const handleRestart = async () => {
    setIsLoading('restart')
    try {
      await onRestart()
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* ダイアログ */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                読書を再開
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hovertext-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 本文 */}
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                {workTitle}
              </h3>
              <p className="text-sm text-gray-600">
                前回は<span className="font-semibold text-purple-600">{Math.round(progress)}%</span>まで読んでいました
              </p>
            </div>

            {/* 進捗バー */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>読書進捗</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={handleContinue}
              disabled={isLoading !== null}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3",
                "bg-purple-600 hover:bg-purple-700 text-white",
                "rounded-lg transition-colors font-medium",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              )}
            >
              {isLoading === 'continue' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  続きから読む
                </>
              )}
            </button>
            
            <button
              onClick={handleRestart}
              disabled={isLoading !== null}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3",
                "bg-gray-100 hover:bg-gray-600",
                "text-gray-700 rounded-lg transition-colors font-medium",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              )}
            >
              {isLoading === 'restart' ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  最初から読む
                </>
              )}
            </button>
          </div>

          {/* フッター */}
          <div className="px-6 pb-6">
            <p className="text-xs text-gray-500 text-center">
              続きから読む場合は、前回の位置まで自動的にスクロールします
            </p>
          </div>
        </div>
      </div>
    </>
  )
}