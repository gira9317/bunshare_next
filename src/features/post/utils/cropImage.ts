/**
 * 画像クロップ処理のユーティリティ関数
 */

import { Area } from 'react-easy-crop'

/**
 * Canvas要素を作成して画像をクロップする
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

/**
 * 度からラジアンに変換
 */
export const getRadianAngle = (degreeValue: number) => {
  return (degreeValue * Math.PI) / 180
}

/**
 * 回転後の画像の境界ボックスを取得
 */
export const getRotatedBoundingBox = (width: number, height: number, rotation: number) => {
  const rotRad = getRadianAngle(rotation)

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

/**
 * 画像をクロップしてCanvas/Blob/File形式で返す
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  outputFormat: 'webp' | 'jpeg' | 'png' = 'webp',
  quality = 0.9
): Promise<{
  file: File
  blob: Blob
  url: string
}> {
  console.log('🔄 [getCroppedImg] Starting crop process...', {
    imageSrc: imageSrc.substring(0, 50) + '...',
    pixelCrop,
    rotation,
    outputFormat,
    quality
  })

  const image = await createImage(imageSrc)
  
  // 解像度制限を適用
  const optimalDimensions = getOptimalDimensions(pixelCrop.width, pixelCrop.height)
  const needsResize = optimalDimensions.width !== pixelCrop.width || optimalDimensions.height !== pixelCrop.height
  
  console.log('📐 [getCroppedImg] Size optimization:', {
    originalSize: { width: pixelCrop.width, height: pixelCrop.height },
    optimizedSize: optimalDimensions,
    needsResize
  })
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas context not available')
  }

  // 最適化されたサイズでCanvasを設定
  canvas.width = optimalDimensions.width
  canvas.height = optimalDimensions.height

  console.log('📐 [getCroppedImg] Final canvas size:', { 
    width: canvas.width, 
    height: canvas.height 
  })

  // シンプルな描画処理（回転なしでテスト）
  if (rotation === 0 && !flip.horizontal && !flip.vertical) {
    // 回転なしの場合はシンプルに描画（最適化されたサイズに合わせてスケール）
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      optimalDimensions.width,
      optimalDimensions.height
    )
  } else {
    // 回転・反転がある場合
    const rotRad = getRadianAngle(rotation)
    
    // Canvas中央を基準にTransform
    ctx.translate(optimalDimensions.width / 2, optimalDimensions.height / 2)
    ctx.rotate(rotRad)
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
    
    // 画像を描画（最適化されたサイズに合わせてスケール）
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      -optimalDimensions.width / 2,
      -optimalDimensions.height / 2,
      optimalDimensions.width,
      optimalDimensions.height
    )
  }

  console.log('✅ [getCroppedImg] Image drawn to canvas')

  // 段階的品質調整で1MB以下に収める
  const MAX_FILE_SIZE = 1024 * 1024 // 1MB
  const qualityLevels = [quality, 0.7, 0.5, 0.3, 0.2]

  for (let i = 0; i < qualityLevels.length; i++) {
    const currentQuality = qualityLevels[i]
    console.log(`🔄 [getCroppedImg] Trying quality: ${currentQuality}`)

    try {
      const result = await new Promise<{ file: File; blob: Blob; url: string }>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'))
              return
            }

            const url = URL.createObjectURL(blob)
            const file = new File([blob], `cropped-image.${outputFormat}`, {
              type: `image/${outputFormat}`,
              lastModified: Date.now(),
            })

            console.log(`📊 [getCroppedImg] Quality ${currentQuality} result:`, {
              fileSize: blob.size,
              fileSizeMB: (blob.size / (1024 * 1024)).toFixed(2) + 'MB',
              fileType: blob.type,
              fileName: file.name,
              withinLimit: blob.size <= MAX_FILE_SIZE
            })

            resolve({ file, blob, url })
          },
          `image/${outputFormat}`,
          currentQuality
        )
      })

      // 1MB以下なら成功
      if (result.blob.size <= MAX_FILE_SIZE) {
        console.log('🎉 [getCroppedImg] Crop completed successfully within size limit')
        return result
      }

      // まだ大きい場合は次の品質レベルを試す
      URL.revokeObjectURL(result.url)
      
    } catch (error) {
      console.error(`❌ [getCroppedImg] Error with quality ${currentQuality}:`, error)
      if (i === qualityLevels.length - 1) {
        throw error
      }
    }
  }

  // すべての品質レベルを試しても1MBを超える場合はエラー
  throw new Error('Unable to compress image below 1MB limit')
}

/**
 * ファイルサイズをバイトから読みやすい形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 画像の最大解像度を制限（1280x720に制限してファイルサイズを抑える）
 */
export const getOptimalDimensions = (
  originalWidth: number, 
  originalHeight: number, 
  maxWidth = 1280,  // 1920 → 1280に変更
  maxHeight = 720   // 1080 → 720に変更
) => {
  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight)
  
  if (ratio >= 1) {
    return { width: originalWidth, height: originalHeight }
  }
  
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  }
}