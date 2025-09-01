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
    username: user.username,
    display_name: user.display_name || '',
    bio: user.bio || '',
    website_url: user.website_url || '',
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
    if (formData.website_url && !isValidUrl(formData.website_url)) {
      newErrors.website_url = '正しいURLを入力してください'
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
            updatedFormData.avatar_url = avatarResult.url
          }
        }
        
        if (coverFile) {
          const coverFormData = new FormData()
          coverFormData.append('cover', coverFile)
          const coverResult = await uploadCover(coverFormData)
          if (coverResult.success) {
            updatedFormData.cover_url = coverResult.url
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
              currentImage={user.avatar_url}
              onImageSelect={setAvatarFile}
              type="avatar"
            />
            <ImageUploadField
              label="カバー画像"
              currentImage={user.cover_url}
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

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              表示名
            </label>
            <input
              type="text"
              value={formData.display_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="表示名を入力（任意）"
            />
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

          {/* Website URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ウェブサイト
            </label>
            <input
              type="url"
              value={formData.website_url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
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