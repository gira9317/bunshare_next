'use client'

import { useState } from 'react'
import { TagInput } from '../leaf/TagInput'
import { PublishingOptions } from '../leaf/PublishingOptions'
import { cn } from '@/lib/utils'

export function WorkCreateSettingsSection() {
  const [tags, setTags] = useState<string[]>([])
  const [isAdultContent, setIsAdultContent] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [publishTiming, setPublishTiming] = useState<'now' | 'scheduled' | 'draft'>('now')
  const [scheduledDate, setScheduledDate] = useState<string>('')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      {/* タグ */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <span className="text-2xl">🏷️</span>
          タグ
        </h2>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <span className="text-2xl">⚙️</span>
          投稿設定
        </h2>

        <div className="space-y-4">
          {/* コメント許可 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className={cn(
                "w-5 h-5 rounded border-gray-300 dark:border-gray-600",
                "text-purple-600 focus:ring-purple-500",
                "transition-colors"
              )}
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                コメントを許可する
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                読者からのコメントを受け付けます
              </p>
            </div>
          </label>

          {/* 年齢制限 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAdultContent}
              onChange={(e) => setIsAdultContent(e.target.checked)}
              className={cn(
                "w-5 h-5 rounded border-gray-300 dark:border-gray-600",
                "text-purple-600 focus:ring-purple-500",
                "transition-colors"
              )}
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                🔞 18歳以上限定コンテンツ
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                18歳未満のユーザーには表示されません
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 公開設定 */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <span className="text-2xl">📅</span>
          公開設定
        </h2>
        
        <PublishingOptions
          publishTiming={publishTiming}
          scheduledDate={scheduledDate}
          onTimingChange={setPublishTiming}
          onDateChange={setScheduledDate}
        />
      </div>
    </div>
  )
}