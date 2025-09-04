'use client'

import { useState } from 'react'
import { ImageUpload } from '../leaf/ImageUpload'

export function WorkCreateMediaSection() {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <span className="text-2xl">🖼️</span>
          ヘッダー画像
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          作品カードの背景に表示される画像です（任意）
        </p>
      </div>

      <ImageUpload
        imageUrl={imageUrl}
        onImageChange={setImageUrl}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
      />
    </div>
  )
}