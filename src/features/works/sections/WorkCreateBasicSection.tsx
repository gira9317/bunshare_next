'use client'

import { useState, useEffect } from 'react'
import { SeriesSelector } from '../leaf/SeriesSelector'
import { CategorySelect } from '../leaf/CategorySelect'
import { cn } from '@/lib/utils'

interface Series {
  series_id: string
  title: string
  description?: string | null
  cover_image_url?: string | null
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
  const [useSeriesImage, setUseSeriesImage] = useState(false)

  // 選択されたシリーズデータをグローバルに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const selectedSeriesData = currentUserSeries.find(series => series.series_id === selectedSeries)
      if (selectedSeriesData) {
        (window as any).selectedSeriesData = selectedSeriesData
        console.log('📚 [WorkCreateBasicSection] Selected series data saved:', selectedSeriesData)
      } else if (selectedSeries === '') {
        (window as any).selectedSeriesData = null
        console.log('📚 [WorkCreateBasicSection] No series selected, cleared series data')
      }
    }
  }, [selectedSeries, currentUserSeries])

  // 新しいシリーズが作成されたときの処理
  const handleSeriesCreated = (newSeries: Series) => {
    console.log('📝 [WorkCreateBasicSection] New series created:', newSeries)
    setCurrentUserSeries(prev => [...prev, newSeries])
    
    // 新しく作成されたシリーズのデータもグローバルに保存
    if (typeof window !== 'undefined') {
      (window as any).selectedSeriesData = newSeries
      console.log('📚 [WorkCreateBasicSection] New series data saved globally:', newSeries)
    }
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

      {/* シリーズ画像使用オプション */}
      {selectedSeries && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            シリーズ設定
          </h3>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="use_series_image"
              checked={useSeriesImage}
              onChange={(e) => setUseSeriesImage(e.target.checked)}
              className={cn(
                "w-4 h-4 rounded border-gray-300 dark:border-gray-600",
                "text-blue-600 focus:ring-blue-500",
                "transition-colors"
              )}
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                シリーズのカバー画像を使用する
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                チェックすると、個別の画像の代わりにシリーズのカバー画像が表示されます
              </p>
            </div>
          </label>
        </div>
      )}

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