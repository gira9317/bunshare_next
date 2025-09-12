'use client'

import { useState, useEffect } from 'react'
import { ImageUpload } from '../leaf/ImageUpload'

// グローバルな画像ファイル管理
declare global {
  interface Window {
    workImageFile?: File | null
    selectedSeriesData?: {
      series_id: string
      title: string
      description?: string | null
      cover_image_url?: string | null
    } | null
  }
}

export function WorkCreateMediaSection() {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [useSeriesImage, setUseSeriesImage] = useState(false)

  const handleImageChange = (url: string, file?: File) => {
    console.log('📁 [WorkCreateMediaSection] Image changed:', {
      url: url.substring(0, 50) + '...',
      fileName: file?.name,
      fileSize: file?.size
    })
    
    setImageUrl(url)
    setImageFile(file || null)
    
    // グローバルに保存してPreviewSectionからアクセス可能にする
    if (typeof window !== 'undefined') {
      window.workImageFile = file || null
      console.log('🌍 [WorkCreateMediaSection] Global window.workImageFile updated:', {
        hasFile: !!(file),
        fileName: file?.name,
        fileSize: file?.size
      })
    }
  }

  // シリーズ画像使用状態を監視
  useEffect(() => {
    const checkSeriesImageUsage = () => {
      const seriesImageCheckbox = document.querySelector('input[name="use_series_image"]') as HTMLInputElement
      if (seriesImageCheckbox) {
        setUseSeriesImage(seriesImageCheckbox.checked)
      }
    }

    // 初回チェック
    checkSeriesImageUsage()

    // MutationObserverでDOMの変更を監視
    const observer = new MutationObserver(() => {
      checkSeriesImageUsage()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['checked']
    })

    // 定期的にもチェック（フォールバック）
    const interval = setInterval(checkSeriesImageUsage, 500)

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [])

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.workImageFile = null
      }
    }
  }, [])

  // シリーズ画像を使用する場合は画像アップロード機能を表示しない
  if (useSeriesImage) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            ヘッダー画像
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            シリーズのカバー画像を使用します
          </p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              シリーズ画像を使用中
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              この作品ではシリーズのカバー画像が表示されます。個別の画像を設定したい場合は、基本情報セクションで「シリーズのカバー画像を使用する」のチェックを外してください。
            </p>
          </div>
        </div>

        {/* Hidden inputs for form submission - シリーズ画像使用時は空値 */}
        <input type="hidden" name="image_url" value="" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          ヘッダー画像
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          作品カードの背景に表示される画像です（任意）
        </p>
      </div>

      <ImageUpload
        imageUrl={imageUrl}
        onImageChange={handleImageChange}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
      />

      {/* Hidden inputs for form submission */}
      <input 
        type="hidden" 
        name="image_url" 
        value={imageUrl} 
      />
      
      {/* デバッグ情報 */}
      {imageFile && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            📝 ファイル情報: {imageFile.name} ({Math.round(imageFile.size / 1024)}KB)
          </p>
        </div>
      )}
    </div>
  )
}