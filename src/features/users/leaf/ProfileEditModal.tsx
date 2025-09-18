'use client'

import { useState, useTransition, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UserProfile, UserProfileUpdateInput } from '../types'
import { updateUserProfile, uploadAvatar, uploadCover } from '../server/actions'
import { ImageUploadField } from './ImageUploadField'
import { EmbeddedImageCropper } from './EmbeddedImageCropper'

interface ProfileEditModalProps {
  user: UserProfile
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function ProfileEditModal({ 
  user, 
  isOpen, 
  onClose, 
  className 
}: ProfileEditModalProps) {
  const [isPending, startTransition] = useTransition()
  
  
  const [formData, setFormData] = useState<UserProfileUpdateInput>({
    username: user.username || '',
    custom_user_id: user.custom_user_id || '',
    bio: user.bio || '',
    website_url: user.website_url || [],
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Step management for step-in modal
  const [currentStep, setCurrentStep] = useState<'edit' | 'crop-avatar' | 'crop-cover'>('edit')
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
  const [tempImageFile, setTempImageFile] = useState<File | null>(null)

  // Prevent background scrolling and hide bottom nav when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      // Add class to hide bottom nav
      document.body.classList.add('modal-open')
      
      return () => {
        // Restore original overflow when modal closes
        document.body.style.overflow = originalOverflow
        // Remove class to show bottom nav
        document.body.classList.remove('modal-open')
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // Handle image selection for cropping
  const handleImageSelected = (file: File, type: 'avatar' | 'cover') => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください')
      return
    }
    
    // Create URL for cropping
    const imageUrl = URL.createObjectURL(file)
    setTempImageSrc(imageUrl)
    setTempImageFile(file)
    setCurrentStep(type === 'avatar' ? 'crop-avatar' : 'crop-cover')
  }

  // Handle crop complete
  const handleCropComplete = (croppedFile: File, croppedUrl: string) => {
    if (currentStep === 'crop-avatar') {
      setAvatarFile(croppedFile)
    } else if (currentStep === 'crop-cover') {
      setCoverFile(croppedFile)
    }
    
    // Clean up temp image
    if (tempImageSrc) {
      URL.revokeObjectURL(tempImageSrc)
    }
    setTempImageSrc(null)
    setTempImageFile(null)
    setCurrentStep('edit')
  }

  // Handle crop cancel
  const handleCropCancel = () => {
    if (tempImageSrc) {
      URL.revokeObjectURL(tempImageSrc)
    }
    setTempImageSrc(null)
    setTempImageFile(null)
    setCurrentStep('edit')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!formData.username?.trim()) {
      newErrors.username = 'ユーザー名は必須です'
    }
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = '自己紹介は500文字以内で入力してください'
    }
    if (formData.website_url && formData.website_url.length > 0) {
      for (const url of formData.website_url) {
        if (url && !isValidUrl(url)) {
          newErrors.website_url = '正しいURLを入力してください'
          break
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    startTransition(async () => {
      try {
        setErrors({}) // Clear previous errors
        let updatedFormData = { ...formData }
        
        // Step 1: Upload images only when save button is clicked
        const imageUploadPromises = []
        
        if (avatarFile) {
          const avatarFormData = new FormData()
          avatarFormData.append('avatar', avatarFile)
          imageUploadPromises.push(
            uploadAvatar(avatarFormData)
              .then(result => ({ type: 'avatar', result }))
              .catch(error => ({ type: 'avatar', error }))
          )
        }
        
        if (coverFile) {
          const coverFormData = new FormData()
          coverFormData.append('cover', coverFile)
          imageUploadPromises.push(
            uploadCover(coverFormData)
              .then(result => ({ type: 'cover', result }))
              .catch(error => ({ type: 'cover', error }))
          )
        }
        
        // Wait for all image uploads to complete
        if (imageUploadPromises.length > 0) {
          const imageResults = await Promise.allSettled(imageUploadPromises)
          
          for (const settledResult of imageResults) {
            if (settledResult.status === 'fulfilled') {
              const { type, result, error } = settledResult.value
              
              if (error) {
                throw new Error(`${type === 'avatar' ? 'アバター' : 'カバー'}画像のアップロードに失敗しました: ${error.message}`)
              }
              
              if (result?.success) {
                if (type === 'avatar') {
                  updatedFormData.avatar_img_url = result.url
                } else if (type === 'cover') {
                  updatedFormData.header_img_url = result.url
                }
              }
            }
          }
        }

        // Step 2: Update profile with all data including uploaded image URLs
        const result = await updateUserProfile(updatedFormData)
        
        if (result.success) {
          // Reset form state
          setAvatarFile(null)
          setCoverFile(null)
          
          // Show success message
          setShowSuccess(true)
          
          // Auto close after 2 seconds
          setTimeout(() => {
            setShowSuccess(false)
            onClose()
          }, 2000)
        } else {
          setErrors({ general: 'プロフィールの更新に失敗しました。もう一度お試しください。' })
        }
      } catch (error: any) {
        console.error('Profile update failed:', error)
        setErrors({ 
          general: error.message || 'エラーが発生しました。ネットワーク接続を確認してもう一度お試しください。'
        })
      }
    })
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <>
      {/* Backdrop - Use dynamic viewport for mobile */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] h-screen supports-[height:100dvh]:h-dvh"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={cn(
          'fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
          currentStep === 'edit' 
            ? 'w-full max-w-md h-screen supports-[height:100dvh]:h-dvh overflow-y-auto md:max-w-md md:max-h-[90vh] md:supports-[height:100dvh]:max-h-[90dvh] md:h-auto'
            : 'w-full max-w-4xl h-screen supports-[height:100dvh]:h-dvh overflow-hidden flex flex-col md:h-[90vh] md:supports-[height:100dvh]:h-[90dvh]',
          'bg-white rounded-none md:rounded-lg shadow-xl z-[60]',
          'border-0 md:border md:border-gray-200 mdborder-gray-700',
          className
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentStep === 'edit' && 'プロフィール編集'}
            {currentStep === 'crop-avatar' && '画像をトリミング - プロフィール画像'}
            {currentStep === 'crop-cover' && '画像をトリミング - カバー画像'}
          </h2>
          <button
            onClick={currentStep === 'edit' ? onClose : handleCropCancel}
            className="text-gray-400 hovertext-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content based on current step */}
        {currentStep === 'edit' ? (
          /* Edit Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {errors.general}
            </div>
          )}
          
          {showSuccess && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>プロフィールを保存しました！</span>
            </div>
          )}

          {/* Image Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadField
              label="プロフィール画像"
              currentImage={user.avatar_img_url}
              onImageSelected={(file) => handleImageSelected(file, 'avatar')}
              type="avatar"
            />
            <ImageUploadField
              label="カバー画像"
              currentImage={user.header_img_url}
              onImageSelected={(file) => handleImageSelected(file, 'cover')}
              type="cover"
              className="col-span-2"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              type="text"
              value={formData.username || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       bg-white text-gray-900
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ユーザー名を入力"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          {/* Custom User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カスタムユーザーID
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                @
              </span>
              <input
                type="text"
                value={formData.custom_user_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_user_id: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md
                         bg-white text-gray-900
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="カスタムID（任意）"
                maxLength={50}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              1-50文字の英数字とアンダースコア
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自己紹介
            </label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       bg-white text-gray-900
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="自己紹介を入力（最大500文字）"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {(formData.bio || '').length}/500
            </div>
            {errors.bio && (
              <p className="text-red-500 text-xs mt-1">{errors.bio}</p>
            )}
          </div>

          {/* Website URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ウェブサイト
            </label>
            {(formData.website_url || []).map((url, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...(formData.website_url || [])]
                    newUrls[index] = e.target.value
                    setFormData(prev => ({ ...prev, website_url: newUrls }))
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md
                           bg-white text-gray-900
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newUrls = (formData.website_url || []).filter((_, i) => i !== index)
                    setFormData(prev => ({ ...prev, website_url: newUrls }))
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-900/20 rounded-md"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newUrls = [...(formData.website_url || []), '']
                setFormData(prev => ({ ...prev, website_url: newUrls }))
              }}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              + ウェブサイトを追加
            </button>
            {errors.website_url && (
              <p className="text-red-500 text-xs mt-1">{errors.website_url}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending || showSuccess}
            >
              {showSuccess ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  保存完了
                </div>
              ) : isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
        ) : (
          /* Cropping UI - Use embedded cropper */
          <div className="flex-1 flex flex-col overflow-hidden">
            {tempImageSrc && (
              <EmbeddedImageCropper
                imageSrc={tempImageSrc}
                onCropComplete={handleCropComplete}
                aspectRatio={currentStep === 'crop-avatar' ? 1 : 16/9}
                outputFormat="webp"
                quality={0.9}
                className="flex-1 min-h-0"
              />
            )}
            
            {/* Bottom cancel button */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCropCancel}
                className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                戻る
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}