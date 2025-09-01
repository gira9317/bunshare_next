'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UserProfile, UserProfileUpdateInput } from '../types'
import { updateUserProfile, uploadAvatar, uploadCover } from '../server/actions'
import { ImageUploadField } from './ImageUploadField'

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

  if (!isOpen) return null

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
        // Upload images first if selected
        let updatedFormData = { ...formData }
        
        if (avatarFile) {
          const avatarFormData = new FormData()
          avatarFormData.append('avatar', avatarFile)
          const avatarResult = await uploadAvatar(avatarFormData)
          if (avatarResult.success) {
            updatedFormData.avatar_img_url = avatarResult.url
          }
        }
        
        if (coverFile) {
          const coverFormData = new FormData()
          coverFormData.append('cover', coverFile)
          const coverResult = await uploadCover(coverFormData)
          if (coverResult.success) {
            updatedFormData.header_img_url = coverResult.url
          }
        }

        const result = await updateUserProfile(updatedFormData)
        if (result.success) {
          onClose()
        } else {
          setErrors({ general: 'プロフィールの更新に失敗しました' })
        }
      } catch (error) {
        setErrors({ general: 'エラーが発生しました' })
        console.error('Profile update failed:', error)
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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-md max-h-[90vh] overflow-y-auto',
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50',
        'border border-gray-200 dark:border-gray-700',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            プロフィール編集
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {errors.general}
            </div>
          )}

          {/* Image Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadField
              label="プロフィール画像"
              currentImage={user.avatar_img_url}
              onImageSelect={setAvatarFile}
              type="avatar"
            />
            <ImageUploadField
              label="カバー画像"
              currentImage={user.header_img_url}
              onImageSelect={setCoverFile}
              type="cover"
              className="col-span-2"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ユーザー名
            </label>
            <input
              type="text"
              value={formData.username || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ユーザー名を入力"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          {/* Custom User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              カスタムユーザーID
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm rounded-l-md">
                @
              </span>
              <input
                type="text"
                value={formData.custom_user_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_user_id: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="カスタムID（任意）"
                maxLength={50}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              1-50文字の英数字とアンダースコア
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              自己紹介
            </label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newUrls = (formData.website_url || []).filter((_, i) => i !== index)
                    setFormData(prev => ({ ...prev, website_url: newUrls }))
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
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
              disabled={isPending}
            >
              {isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}