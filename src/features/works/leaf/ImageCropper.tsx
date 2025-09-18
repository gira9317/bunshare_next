'use client'

import { useState, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import { X, RotateCw, ZoomIn, ZoomOut, Download, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import getCroppedImg from '../utils/cropImage'

interface ImageCropperProps {
  imageSrc: string
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedFile: File, croppedUrl: string) => void
  aspectRatio?: number
  outputFormat?: 'webp' | 'jpeg' | 'png'
  quality?: number
}

export function ImageCropper({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
  aspectRatio = 16 / 9,
  outputFormat = 'webp',
  quality = 0.9
}: ImageCropperProps) {
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

  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white sm:rounded-xl max-w-4xl w-full h-full sm:max-h-[90vh] overflow-hidden sm:overflow-auto flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            画像をトリミング
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* クロッパー */}
        <div className="relative flex-1 min-h-[300px] sm:h-96 bg-gray-100">
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

        {/* コントロール */}
        <div className="flex-shrink-0 p-4 space-y-4 pb-safe">
          {/* 操作説明 */}
          <div className="text-sm text-gray-600 text-center space-y-1">
            <p className="hidden md:block">マウスホイールでズーム、ドラッグで位置調整</p>
            <p className="md:hidden">ピンチでズーム、ドラッグで位置調整</p>
            <p className="text-xs">または下のボタンでズーム操作できます</p>
          </div>
          
          {/* ズームボタン */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleZoomOut}
              className="p-3 hover:bg-gray-800 rounded-full transition-colors"
              disabled={zoom <= 1}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-3 hover:bg-gray-800 rounded-full transition-colors"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* 操作ボタン */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={handleRotate}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "bg-gray-100",
                  "hover:bg-gray-50",
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
                  "text-gray-600",
                  "hover:bg-gray-800",
                  "transition-colors"
                )}
              >
                リセット
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg",
                  "text-gray-600",
                  "hover:bg-gray-800",
                  "transition-colors"
                )}
              >
                キャンセル
              </button>
              
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
                    <Check className="w-4 h-4" />
                    決定
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 設定情報 */}
          <div className="hidden sm:block text-xs text-gray-500 space-y-1">
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
    </div>
  )
}