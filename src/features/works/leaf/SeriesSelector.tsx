'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Series {
  series_id: string
  title: string
  description?: string | null
}

interface SeriesSelectorProps {
  userSeries: Series[]
  selectedSeries: string
  episodeNumber: number | null
  onSeriesChange: (seriesId: string) => void
  onEpisodeNumberChange: (episodeNumber: number | null) => void
}

export function SeriesSelector({
  userSeries,
  selectedSeries,
  episodeNumber,
  onSeriesChange,
  onEpisodeNumberChange
}: SeriesSelectorProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [newSeriesDescription, setNewSeriesDescription] = useState('')

  const handleCreateSeries = async () => {
    // TODO: Server Action実装後に接続
    console.log('Creating series:', { newSeriesTitle, newSeriesDescription })
    setShowCreateModal(false)
    setNewSeriesTitle('')
    setNewSeriesDescription('')
  }

  return (
    <>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          シリーズ
        </label>
        
        <div className="flex gap-2">
          <select
            value={selectedSeries}
            onChange={(e) => {
              onSeriesChange(e.target.value)
              if (e.target.value) {
                onEpisodeNumberChange(1) // デフォルトエピソード番号
              } else {
                onEpisodeNumberChange(null)
              }
            }}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg border",
              "bg-white dark:bg-gray-900",
              "border-gray-300 dark:border-gray-600",
              "text-gray-900 dark:text-white",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
              "transition-colors"
            )}
          >
            <option value="">シリーズを選択（任意）</option>
            {userSeries.map((series) => (
              <option key={series.series_id} value={series.series_id}>
                {series.title}
              </option>
            ))}
          </select>
          
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className={cn(
              "px-4 py-2 rounded-lg",
              "bg-purple-600 hover:bg-purple-700",
              "text-white font-medium",
              "transition-colors",
              "flex items-center gap-2"
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新規作成</span>
          </button>
        </div>

        {/* エピソード番号入力 */}
        {selectedSeries && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-2">
            <label htmlFor="episodeNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              エピソード番号
            </label>
            <input
              type="number"
              id="episodeNumber"
              value={episodeNumber || ''}
              onChange={(e) => onEpisodeNumberChange(parseInt(e.target.value) || null)}
              min="1"
              className={cn(
                "w-full px-4 py-2 rounded-lg border",
                "bg-white dark:bg-gray-900",
                "border-gray-300 dark:border-gray-600",
                "text-gray-900 dark:text-white",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                "transition-colors"
              )}
              placeholder="例: 1, 2, 3..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              シリーズ内での順序を指定します
            </p>
          </div>
        )}
      </div>

      {/* シリーズ作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              新しいシリーズを作成
            </h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                シリーズタイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSeriesTitle}
                onChange={(e) => setNewSeriesTitle(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border",
                  "bg-white dark:bg-gray-900",
                  "border-gray-300 dark:border-gray-600",
                  "text-gray-900 dark:text-white",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                )}
                placeholder="シリーズのタイトル"
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                シリーズ概要
              </label>
              <textarea
                value={newSeriesDescription}
                onChange={(e) => setNewSeriesDescription(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border",
                  "bg-white dark:bg-gray-900",
                  "border-gray-300 dark:border-gray-600",
                  "text-gray-900 dark:text-white",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                  "resize-none"
                )}
                placeholder="シリーズの概要（任意）"
                rows={3}
                maxLength={500}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setNewSeriesTitle('')
                  setNewSeriesDescription('')
                }}
                className={cn(
                  "px-4 py-2 rounded-lg",
                  "bg-gray-200 dark:bg-gray-700",
                  "text-gray-700 dark:text-gray-300",
                  "hover:bg-gray-300 dark:hover:bg-gray-600",
                  "transition-colors"
                )}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateSeries}
                disabled={!newSeriesTitle}
                className={cn(
                  "px-4 py-2 rounded-lg",
                  "bg-purple-600 hover:bg-purple-700",
                  "text-white font-medium",
                  "transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}