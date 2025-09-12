'use client'

import { useState } from 'react'
import { X, Send, Check, RotateCcw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProofreadingPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  onApplyChanges: (newText: string) => void
}

interface ProofreadingResult {
  originalText: string
  revisedText: string
  explanation?: string
}

export function ProofreadingPanel({ 
  isOpen, 
  onClose, 
  selectedText, 
  onApplyChanges 
}: ProofreadingPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ProofreadingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProofread = async () => {
    if (!prompt.trim() || !selectedText.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/works/proofreading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedText,
          prompt: prompt.trim()
        })
      })

      if (!response.ok) {
        throw new Error('校正APIでエラーが発生しました')
      }

      const data = await response.json()
      
      setResult({
        originalText: selectedText,
        revisedText: data.revisedText,
        explanation: data.explanation
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '校正処理でエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = () => {
    if (result) {
      onApplyChanges(result.revisedText)
      handleReset()
    }
  }

  const handleReset = () => {
    setPrompt('')
    setResult(null)
    setError(null)
    setIsLoading(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full w-96 z-50",
      "bg-white dark:bg-gray-800",
      "border-l border-gray-200 dark:border-gray-700",
      "shadow-xl",
      "transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI 校正
        </h3>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex flex-col h-[calc(100%-73px)]">
        {/* 選択されたテキスト表示 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            選択されたテキスト
          </p>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-900 dark:text-white max-h-32 overflow-y-auto">
            {selectedText}
          </div>
        </div>

        {/* プロンプト入力 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            修正の指示
          </p>
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例: 敬語を丁寧語に統一してください"
              className={cn(
                "w-full h-24 px-3 py-2 rounded-lg border resize-none",
                "bg-white dark:bg-gray-900",
                "border-gray-300 dark:border-gray-600",
                "text-gray-900 dark:text-white",
                "placeholder-gray-500 dark:placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              )}
              disabled={isLoading}
            />
            <button
              onClick={handleProofread}
              disabled={isLoading || !prompt.trim() || !selectedText.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg",
                "bg-purple-600 text-white font-medium",
                "hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isLoading ? '校正中...' : '校正実行'}
            </button>
          </div>
        </div>

        {/* 結果表示 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  修正案
                </p>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-gray-900 dark:text-white">
                  {result.revisedText}
                </div>
              </div>

              {result.explanation && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    修正理由
                  </p>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                    {result.explanation}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg",
                    "bg-green-600 text-white font-medium",
                    "hover:bg-green-700 transition-colors"
                  )}
                >
                  <Check className="w-4 h-4" />
                  適用
                </button>
                <button
                  onClick={handleReset}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg",
                    "bg-gray-600 text-white font-medium",
                    "hover:bg-gray-700 transition-colors"
                  )}
                >
                  <RotateCcw className="w-4 h-4" />
                  リセット
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}