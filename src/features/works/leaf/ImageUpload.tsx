'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  imageUrl: string
  onImageChange: (url: string) => void
  isUploading: boolean
  setIsUploading: (uploading: boolean) => void
}

export function ImageUpload({ 
  imageUrl, 
  onImageChange, 
  isUploading, 
  setIsUploading 
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください')
      return
    }

    // プレビューURL生成
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // TODO: 実際のアップロード処理
    setIsUploading(true)
    
    // 仮のアップロード処理（実際はSupabase Storageへアップロード）
    setTimeout(() => {
      onImageChange(url)
      setIsUploading(false)
    }, 1000)
  }

  const handleRemove = () => {
    setPreviewUrl('')
    onImageChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {!previewUrl ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8",
            "transition-all duration-200",
            dragActive
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-purple-400",
            "cursor-pointer"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleChange}
          />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                画像をアップロード
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                クリックまたはドラッグ&ドロップ
              </p>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              JPG, PNG, GIF (最大10MB)
            </p>
          </div>
          
          {isUploading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">アップロード中...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden">
          <Image
            src={previewUrl}
            alt="Preview"
            width={800}
            height={400}
            className="w-full h-64 object-cover"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "p-2 rounded-lg",
                "bg-white/20 backdrop-blur-sm",
                "hover:bg-white/30",
                "transition-colors"
              )}
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
            
            <button
              type="button"
              onClick={handleRemove}
              className={cn(
                "p-2 rounded-lg",
                "bg-red-500/80 backdrop-blur-sm",
                "hover:bg-red-600/80",
                "transition-colors"
              )}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  )
}