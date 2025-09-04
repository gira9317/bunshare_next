'use client'

import { useState } from 'react'
import { SeriesSelector } from '../leaf/SeriesSelector'
import { CategorySelect } from '../leaf/CategorySelect'
import { cn } from '@/lib/utils'

interface Series {
  series_id: string
  title: string
  description?: string | null
}

interface WorkCreateBasicSectionProps {
  userSeries: Series[]
}

export function WorkCreateBasicSection({ userSeries }: WorkCreateBasicSectionProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [currentUserSeries, setCurrentUserSeries] = useState(userSeries)

  // 新しいシリーズが作成されたときの処理
  const handleSeriesCreated = (newSeries: Series) => {
    console.log('📝 [WorkCreateBasicSection] New series created:', newSeries)
    setCurrentUserSeries(prev => [...prev, newSeries])
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <span className="text-2xl">📝</span>
        基本情報
      </h2>

      {/* タイトル */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            "w-full px-4 py-2 rounded-lg border",
            "bg-white dark:bg-gray-900",
            "border-gray-300 dark:border-gray-600",
            "text-gray-900 dark:text-white",
            "placeholder-gray-500 dark:placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
            "transition-colors"
          )}
          placeholder="作品のタイトルを入力してください"
          maxLength={100}
          required
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>作品のタイトルを入力してください</span>
          <span>{title.length}/100</span>
        </div>
      </div>

      {/* カテゴリ */}
      <CategorySelect value={category} onChange={setCategory} />

      {/* シリーズ */}
      <SeriesSelector
        userSeries={currentUserSeries}
        selectedSeries={selectedSeries}
        episodeNumber={episodeNumber}
        onSeriesChange={setSelectedSeries}
        onEpisodeNumberChange={setEpisodeNumber}
        onSeriesCreated={handleSeriesCreated}
      />

      {/* 概要 */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          概要
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={cn(
            "w-full px-4 py-3 rounded-lg border",
            "bg-white dark:bg-gray-900",
            "border-gray-300 dark:border-gray-600",
            "text-gray-900 dark:text-white",
            "placeholder-gray-500 dark:placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
            "transition-colors resize-none"
          )}
          placeholder="作品の概要や見どころを簡潔に..."
          rows={3}
          maxLength={200}
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>作品の概要を簡潔に記述してください</span>
          <span>{description.length}/200</span>
        </div>
      </div>
    </div>
  )
}