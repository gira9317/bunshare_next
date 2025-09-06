'use client'

import { useState } from 'react'
import { SettingToggle } from './SettingToggle'
import { UserWithStats } from '../schemas'
import { updatePrivacySettings } from '../server/actions'

interface PrivacySettingsCardProps {
  user: UserWithStats
}

export function PrivacySettingsCard({ user }: PrivacySettingsCardProps) {
  const [settings, setSettings] = useState({
    public_profile: user.public_profile ?? true,
    follow_approval: user.follow_approval ?? false
  })

  const handleUpdateSetting = async (key: keyof typeof settings, value: boolean) => {
    try {
      const updatedSettings = { ...settings, [key]: value }
      setSettings(updatedSettings)
      
      await updatePrivacySettings({
        [key]: value
      })
    } catch (error) {
      // Revert on error
      setSettings(settings)
      console.error('Failed to update privacy setting:', error)
      // TODO: Show toast notification
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        プライバシー設定
      </h3>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-1">
        <SettingToggle
          id="publicProfile"
          label="プロフィール公開"
          description="他のユーザーがあなたのプロフィールを閲覧できます"
          checked={settings.public_profile}
          onChange={(checked) => handleUpdateSetting('public_profile', checked)}
        />
        
        <div className="border-t border-gray-200 dark:border-gray-700 my-3" />
        
        <SettingToggle
          id="followApproval"
          label="フォロー許可制"
          description="フォローリクエストを承認制にします"
          checked={settings.follow_approval}
          onChange={(checked) => handleUpdateSetting('follow_approval', checked)}
        />
      </div>
    </div>
  )
}