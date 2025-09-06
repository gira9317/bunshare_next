'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserWithStats } from '../schemas'
import { Mail, Key, ChevronRight } from 'lucide-react'
import { EmailChangeModal } from './EmailChangeModal'
import { SettingToggle } from './SettingToggle'
import { updateBookmarkModalSetting } from '../server/actions'

interface AccountSettingsCardProps {
  user: UserWithStats
}

export function AccountSettingsCard({ user }: AccountSettingsCardProps) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [bookmarkModalEnabled, setBookmarkModalEnabled] = useState(!user.hide_bookmark_modal)

  const handleBookmarkModalToggle = async (enabled: boolean) => {
    try {
      setBookmarkModalEnabled(enabled)
      await updateBookmarkModalSetting({ hide_bookmark_modal: !enabled })
    } catch (error) {
      // Revert on error
      setBookmarkModalEnabled(!enabled)
      console.error('Failed to update bookmark modal setting:', error)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          アカウント設定
        </h3>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <SettingToggle
            id="bookmarkModal"
            label="しおり確認モーダル"
            description="作品ページでしおりから再開するか確認する"
            checked={bookmarkModalEnabled}
            onChange={handleBookmarkModalToggle}
          />
        </div>
        
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => setIsEmailModalOpen(true)}
            className="w-full justify-between px-4 py-3 h-auto bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Mail className="w-4 h-4" />
              メールアドレス変更
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/auth/forgot-password'}
            className="w-full justify-between px-4 py-3 h-auto bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Key className="w-4 h-4" />
              パスワードリセット
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Email Change Modal */}
      <EmailChangeModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentEmail={user.email}
      />
    </>
  )
}