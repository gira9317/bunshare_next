'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ImageCropModalProps {
  isOpen: boolean
  onClose: () => void
  imageFile: File
  onCropComplete: (croppedFile: File) => void
  aspectRatio?: number
  className?: string
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
  aspectRatio = 1,
  className
}: ImageCropModalProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [crop, setCrop] = useState({ x: 50, y: 50, width: 200, height: 200 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageUrl(url)
      
      // Initialize crop area based on aspect ratio
      const baseSize = 200
      const width = baseSize
      const height = baseSize / aspectRatio
      
      setCrop({
        x: 50,
        y: 50,
        width,
        height
      })
      
      return () => URL.revokeObjectURL(url)
    }
  }, [imageFile, aspectRatio])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    const rect = imageRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left - crop.x,
        y: e.clientY - rect.top - crop.y
      })
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(e.clientX - rect.left - dragStart.x, rect.width - crop.width))
    const newY = Math.max(0, Math.min(e.clientY - rect.top - dragStart.y, rect.height - crop.height))
    
    setCrop(prev => ({ ...prev, x: newX, y: newY }))
  }, [isDragging, dragStart, crop.width, crop.height])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation()
    setIsResizing(true)
    const rect = imageRef.current?.getBoundingClientRect()
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: crop.width,
        height: crop.height
      })
    }
  }

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const deltaX = e.clientX - resizeStart.x
    const deltaY = e.clientY - resizeStart.y
    
    // Calculate new dimensions based on the larger delta to maintain aspect ratio
    const delta = Math.max(deltaX, deltaY)
    let newWidth = Math.max(50, resizeStart.width + delta)
    let newHeight = newWidth / aspectRatio
    
    // Ensure crop area stays within image bounds
    const maxWidth = rect.width - crop.x
    const maxHeight = rect.height - crop.y
    
    if (newWidth > maxWidth || newHeight > maxHeight) {
      if (maxWidth / aspectRatio < maxHeight) {
        newWidth = maxWidth
        newHeight = newWidth / aspectRatio
      } else {
        newHeight = maxHeight
        newWidth = newHeight * aspectRatio
      }
    }
    
    setCrop(prev => ({ ...prev, width: newWidth, height: newHeight }))
  }, [isResizing, resizeStart, aspectRatio, crop.x, crop.y])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, handleMouseMove, handleResizeMove, handleMouseUp])

  const handleCrop = async () => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const image = imageRef.current

    if (!ctx) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = crop.width * scaleX
    canvas.height = crop.height * scaleY

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    )

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now()
        })
        onCropComplete(croppedFile)
        onClose()
      }
    }, imageFile.type, 0.9)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-2xl max-h-[90vh] overflow-hidden',
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50',
        'border border-gray-200 dark:border-gray-700',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            画像をトリミング
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image Crop Area */}
        <div className="p-4">
          <div className="relative inline-block">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              className="max-w-full max-h-[400px] object-contain"
              draggable={false}
            />
            
            {/* Crop Overlay */}
            <div
              className="absolute border-2 border-white cursor-move"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
                backgroundColor: 'transparent',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Resize handles */}
              <div 
                className="absolute w-3 h-3 bg-white border border-gray-300 rounded-full -top-1.5 -left-1.5 cursor-nw-resize shadow-md hover:bg-blue-50"
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
              ></div>
              <div 
                className="absolute w-3 h-3 bg-white border border-gray-300 rounded-full -top-1.5 -right-1.5 cursor-ne-resize shadow-md hover:bg-blue-50"
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
              ></div>
              <div 
                className="absolute w-3 h-3 bg-white border border-gray-300 rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize shadow-md hover:bg-blue-50"
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
              ></div>
              <div 
                className="absolute w-3 h-3 bg-white border border-gray-300 rounded-full -bottom-1.5 -right-1.5 cursor-se-resize shadow-md hover:bg-blue-50"
                onMouseDown={(e) => handleResizeStart(e, 'se')}
              ></div>
            </div>
          </div>
          
          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleCrop}
            className="flex-1"
          >
            トリミングを適用
          </Button>
        </div>
      </div>
    </>
  )
}