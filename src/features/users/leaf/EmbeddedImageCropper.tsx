'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import getCroppedImg from '../../works/utils/cropImage'

interface EmbeddedImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedFile: File, croppedUrl: string) => void
  aspectRatio?: number
  outputFormat?: 'webp' | 'jpeg' | 'png'
  quality?: number
  className?: string
}

export function EmbeddedImageCropper({
  imageSrc,
  onCropComplete,
  aspectRatio = 16 / 9,
  outputFormat = 'webp',
  quality = 0.9,
  className
}: EmbeddedImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleCropImage = useCallback(async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const { file, url } = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        outputFormat,
        quality
      )
      onCropComplete(file, url)
    } catch (error) {
      console.error('Failed to crop image:', error)
      if (error instanceof Error && error.message.includes('1MB limit')) {
        alert('画像サイズが大きすぎるため、品質を下げても1MB以下に圧縮できませんでした。より小さい範囲でトリミングしてください。')
      } else {
        alert('画像の切り抜きに失敗しました')
      }
    } finally {
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, rotation, outputFormat, quality, onCropComplete])

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 1))
  }

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setRotation(0)
    setZoom(1)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Cropper */}
      <div className="relative flex-1 min-h-[300px] bg-gray-100 dark:bg-gray-800">
        <Cropper
          image={imageSrc}
          crop={crop}
          rotation={rotation}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={setCrop}
          onRotationChange={setRotation}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={setZoom}
          onWheelRequest={(event) => {
            const { deltaY } = event
            const zoomStep = 0.1
            const newZoom = deltaY < 0 
              ? Math.min(zoom + zoomStep, 3)
              : Math.max(zoom - zoomStep, 1)
            setZoom(newZoom)
          }}
          style={{
            containerStyle: {
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent'
            }
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 p-4 space-y-4">
        {/* Instructions */}
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center space-y-1">
          <p className="hidden md:block">マウスホイールでズーム、ドラッグで位置調整</p>
          <p className="md:hidden">ピンチでズーム、ドラッグで位置調整</p>
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            disabled={zoom <= 1}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleRotate}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg",
                "bg-gray-100 dark:bg-gray-700",
                "hover:bg-gray-200 dark:hover:bg-gray-600",
                "transition-colors"
              )}
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-sm">回転</span>
            </button>
            
            <button
              onClick={handleReset}
              className={cn(
                "px-3 py-2 text-sm rounded-lg",
                "text-gray-600 dark:text-gray-400",
                "hover:bg-gray-100 dark:hover:bg-gray-700",
                "transition-colors"
              )}
            >
              リセット
            </button>
          </div>

          <button
            onClick={handleCropImage}
            disabled={isProcessing || !croppedAreaPixels}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm rounded-lg",
              "bg-purple-600 text-white",
              "hover:bg-purple-700",
              "disabled:bg-gray-300 disabled:text-gray-500",
              "transition-colors"
            )}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                処理中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                適用
              </>
            )}
          </button>
        </div>

        {/* Settings info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>アスペクト比:</span>
            <span>{aspectRatio === 16/9 ? '16:9' : aspectRatio === 1 ? '1:1' : aspectRatio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>出力形式:</span>
            <span>{outputFormat.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>品質:</span>
            <span>{Math.round(quality * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}