'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ImageCropper } from '../../works/leaf/ImageCropper'

interface ImageUploadFieldProps {
  label: string
  currentImage?: string
  onImageSelect?: (file: File) => void
  onImageSelected?: (file: File) => void  // For step-in modal
  type?: 'avatar' | 'cover'
  className?: string
}

export function ImageUploadField({
  label,
  currentImage,
  onImageSelect,
  onImageSelected,
  type = 'avatar',
  className
}: ImageUploadFieldProps) {
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAvatar = type === 'avatar'

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください')
      return
    }

    // If onImageSelected is provided (step-in modal), use it
    if (onImageSelected) {
      onImageSelected(file)
      return
    }

    // Otherwise, use the old flow with built-in cropper
    const imageUrl = URL.createObjectURL(file)
    setImageSrc(imageUrl)
    setCropModalOpen(true)
  }, [onImageSelected])

  const handleCropComplete = useCallback((croppedFile: File, croppedUrl: string) => {
    // Set preview from cropped URL
    setPreview(croppedUrl)
    onImageSelect?.(croppedFile)
    
    // Clean up
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc)
    }
    setImageSrc(null)
    setCropModalOpen(false)
  }, [onImageSelect, imageSrc])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative cursor-pointer transition-all duration-200',
          'border-2 border-dashed border-gray-300',
          'hover:border-blue-500',
          'bg-gray-50',
          dragOver && 'border-blue-500 bg-blue-50',
          isAvatar ? 'w-32 h-32 rounded-full' : 'w-full h-32 rounded-lg'
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className={cn(
                'w-full h-full object-cover',
                isAvatar ? 'rounded-full' : 'rounded-lg'
              )}
            />
            <div className={cn(
              'absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30',
              'flex items-center justify-center transition-all duration-200',
              'text-white opacity-0 hover:opacity-100',
              isAvatar ? 'rounded-full' : 'rounded-lg'
            )}>
              <div className="text-center">
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs">変更</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm text-gray-500 text-center">
              クリックまたはドラッグして<br />画像を選択
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <div className="text-xs text-gray-500">
        JPG、PNG、GIF対応（最大5MB、WebP圧縮で自動最適化）
      </div>
      
      {/* Image Cropper - Only render if not using step-in modal */}
      {!onImageSelected && (
        <ImageCropper
          imageSrc={imageSrc || ''}
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false)
            if (imageSrc) {
              URL.revokeObjectURL(imageSrc)
            }
            setImageSrc(null)
          }}
          onCropComplete={handleCropComplete}
          aspectRatio={isAvatar ? 1 : 16/9}
          outputFormat="webp"
          quality={0.9}
        />
      )}
    </div>
  )
}