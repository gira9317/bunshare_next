'use client'

import { Calendar, Rocket, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PublishingOptionsProps {
  publishTiming: 'now' | 'scheduled' | 'draft'
  scheduledDate: string
  onTimingChange: (timing: 'now' | 'scheduled' | 'draft') => void
  onDateChange: (date: string) => void
}

export function PublishingOptions({
  publishTiming,
  scheduledDate,
  onTimingChange,
  onDateChange
}: PublishingOptionsProps) {
  // 現在時刻の1時間後をデフォルト値として設定
  const getMinDateTime = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    return now.toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 今すぐ公開 */}
        <button
          type="button"
          onClick={() => onTimingChange('now')}
          className={cn(
            "p-4 rounded-lg border transition-all",
            "hover:scale-105 active:scale-95",
            publishTiming === 'now'
              ? "bg-purple-600 border-purple-600 text-white"
              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400"
          )}
        >
          <Rocket className="w-6 h-6 mx-auto mb-2" />
          <div className="text-sm font-medium">今すぐ公開</div>
          <div className="text-xs mt-1 opacity-80">
            すぐに公開されます
          </div>
        </button>

        {/* 予約投稿 */}
        <button
          type="button"
          onClick={() => onTimingChange('scheduled')}
          className={cn(
            "p-4 rounded-lg border transition-all",
            "hover:scale-105 active:scale-95",
            publishTiming === 'scheduled'
              ? "bg-purple-600 border-purple-600 text-white"
              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400"
          )}
        >
          <Calendar className="w-6 h-6 mx-auto mb-2" />
          <div className="text-sm font-medium">予約投稿</div>
          <div className="text-xs mt-1 opacity-80">
            日時を指定
          </div>
        </button>

        {/* 下書き保存 */}
        <button
          type="button"
          onClick={() => onTimingChange('draft')}
          className={cn(
            "p-4 rounded-lg border transition-all",
            "hover:scale-105 active:scale-95",
            publishTiming === 'draft'
              ? "bg-purple-600 border-purple-600 text-white"
              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400"
          )}
        >
          <Save className="w-6 h-6 mx-auto mb-2" />
          <div className="text-sm font-medium">下書き保存</div>
          <div className="text-xs mt-1 opacity-80">
            後で公開
          </div>
        </button>
      </div>

      {/* 予約日時入力 */}
      {publishTiming === 'scheduled' && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-3">
          <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            公開予定日時 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="scheduledDate"
            value={scheduledDate}
            onChange={(e) => onDateChange(e.target.value)}
            min={getMinDateTime()}
            className={cn(
              "w-full px-4 py-2 rounded-lg border",
              "bg-white dark:bg-gray-900",
              "border-gray-300 dark:border-gray-600",
              "text-gray-900 dark:text-white",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
              "transition-colors"
            )}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            指定した日時に自動的に公開されます
          </p>
        </div>
      )}
    </div>
  )
}