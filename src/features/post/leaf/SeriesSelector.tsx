'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createSeriesAction, getLatestEpisodeNumberAction } from '../server/actions'
import { ImageUpload } from './ImageUpload'

interface Series {
  series_id: string
  title: string
  description?: string | null
  cover_image_url?: string | null
}

interface SeriesSelectorProps {
  userSeries: Series[]
  selectedSeries: string
  episodeNumber: number | null
  onSeriesChange: (seriesId: string) => void
  onEpisodeNumberChange: (episodeNumber: number | null) => void
  onSeriesCreated?: (series: Series) => void
}

export function SeriesSelector({
  userSeries,
  selectedSeries,
  episodeNumber,
  onSeriesChange,
  onEpisodeNumberChange,
  onSeriesCreated
}: SeriesSelectorProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [newSeriesDescription, setNewSeriesDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [seriesImageUrl, setSeriesImageUrl] = useState<string>('')
  const [isImageUploading, setIsImageUploading] = useState(false)

  // グローバルな画像ファイル管理（SeriesSelector専用）
  const [seriesImageFile, setSeriesImageFile] = useState<File | null>(null)

  const handleSeriesImageChange = (url: string, file?: File) => {
    console.log('🖼️ [SeriesSelector] Series image changed:', {
      url: url.substring(0, 50) + '...',
      fileName: file?.name,
      fileSize: file?.size
    })
    
    setSeriesImageUrl(url)
    setSeriesImageFile(file || null)
  }

  const handleCreateSeries = async () => {
    if (!newSeriesTitle.trim()) {
      alert('シリーズタイトルを入力してください')
      return
    }

    setIsCreating(true)
    
    try {
      // FormDataを作成
      const formData = new FormData()
      formData.append('title', newSeriesTitle)
      if (newSeriesDescription) {
        formData.append('description', newSeriesDescription)
      }
      if (seriesImageFile) {
        formData.append('image_file', seriesImageFile)
        console.log('📎 [SeriesSelector] Image file added to FormData:', {
          name: seriesImageFile.name,
          size: seriesImageFile.size,
          type: seriesImageFile.type
        })
      }

      const result = await createSeriesAction(formData)
      
      if (result.success && result.series) {
        // 新しく作成されたシリーズを選択
        onSeriesChange(result.series.series_id)
        onEpisodeNumberChange(1) // 新規シリーズは常に第1話
        
        // 親コンポーネントに通知（リストを更新するため）
        onSeriesCreated?.(result.series)
        
        // モーダルを閉じてフォームをリセット
        setShowCreateModal(false)
        setNewSeriesTitle('')
        setNewSeriesDescription('')
        setSeriesImageUrl('')
        setSeriesImageFile(null)
        
        console.log('✅ Series created successfully:', result.series)
      } else {
        console.error('❌ Series creation failed:', result.error)
        alert(result.error || 'シリーズの作成に失敗しました')
      }
    } catch (error) {
      console.error('💥 Unexpected error:', error)
      alert('エラーが発生しました')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          シリーズ
        </label>
        
        <div className="flex gap-2">
          <select
            name="series_id"
            value={selectedSeries}
            onChange={async (e) => {
              const seriesId = e.target.value
              onSeriesChange(seriesId)
              
              if (seriesId) {
                // シリーズが選択された場合、最新エピソード番号を取得
                try {
                  const result = await getLatestEpisodeNumberAction(seriesId)
                  if (result.success && result.nextEpisodeNumber) {
                    onEpisodeNumberChange(result.nextEpisodeNumber)
                  } else {
                    onEpisodeNumberChange(1) // フォールバック
                  }
                } catch (error) {
                  console.error('エピソード番号取得エラー:', error)
                  onEpisodeNumberChange(1) // エラー時はデフォルト値
                }
              } else {
                onEpisodeNumberChange(null)
              }
            }}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg border",
              "bg-white",
              "border-gray-300",
              "text-gray-900",
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
          <div className="p-4 bg-purple-50 rounded-lg space-y-2">
            <label htmlFor="episodeNumber" className="block text-sm font-medium text-gray-700">
              エピソード番号
            </label>
            <input
              type="number"
              id="episodeNumber"
              name="episode_number"
              value={episodeNumber || ''}
              onChange={(e) => onEpisodeNumberChange(parseInt(e.target.value) || null)}
              min="1"
              className={cn(
                "w-full px-4 py-2 rounded-lg border",
                "bg-white",
                "border-gray-300",
                "text-gray-900",
                "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                "transition-colors"
              )}
              placeholder="例: 1, 2, 3..."
            />
            <p className="text-xs text-gray-500">
              シリーズ内での順序を指定します
            </p>
          </div>
        )}
      </div>

      {/* シリーズ作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              新しいシリーズを作成
            </h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                シリーズタイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSeriesTitle}
                onChange={(e) => setNewSeriesTitle(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border",
                  "bg-white",
                  "border-gray-300",
                  "text-gray-900",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                )}
                placeholder="シリーズのタイトル"
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                シリーズ概要
              </label>
              <textarea
                value={newSeriesDescription}
                onChange={(e) => setNewSeriesDescription(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 rounded-lg border",
                  "bg-white",
                  "border-gray-300",
                  "text-gray-900",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                  "resize-none"
                )}
                placeholder="シリーズの概要（任意）"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                カバー画像（任意）
              </label>
              <p className="text-xs text-gray-500">
                シリーズのカバー画像です。16:9の比率でトリミングされます。
              </p>
              <ImageUpload
                imageUrl={seriesImageUrl}
                onImageChange={handleSeriesImageChange}
                isUploading={isImageUploading}
                setIsUploading={setIsImageUploading}
                aspectRatio={16 / 9}
                outputFormat="webp"
                quality={0.9}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setNewSeriesTitle('')
                  setNewSeriesDescription('')
                  setSeriesImageUrl('')
                  setSeriesImageFile(null)
                }}
                className={cn(
                  "px-4 py-2 rounded-lg",
                  "bg-gray-200",
                  "text-gray-700",
                  "hover:bg-gray-600",
                  "transition-colors"
                )}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateSeries}
                disabled={!newSeriesTitle || isCreating}
                className={cn(
                  "px-4 py-2 rounded-lg",
                  "bg-purple-600 hover:bg-purple-700",
                  "text-white font-medium",
                  "transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    作成中...
                  </>
                ) : (
                  '作成'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}