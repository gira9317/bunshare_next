'use client'

import { useState } from 'react'
import { SettingToggle } from './SettingToggle'
import { UserWithStats } from '../schemas'
import { updateNotificationSettings } from '../server/actions'

interface NotificationSettingsCardProps {
  user: UserWithStats
}

export function NotificationSettingsCard({ user }: NotificationSettingsCardProps) {
  const [settings, setSettings] = useState({
    like_notification: user.like_notification ?? true,
    comment_notification: user.comment_notification ?? true,
    follow_notification: user.follow_notification ?? true,
    email_notification: user.email_notification ?? false
  })

  const handleUpdateSetting = async (key: keyof typeof settings, value: boolean) => {
    try {
      const updatedSettings = { ...settings, [key]: value }
      setSettings(updatedSettings)
      
      await updateNotificationSettings({
        [key]: value
      })
    } catch (error) {
      // Revert on error
      setSettings(settings)
      console.error('Failed to update notification setting:', error)
      // TODO: Show toast notification
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        通知設定
      </h3>
      
      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
        <SettingToggle
          id="likeNotification"
          label="いいね通知"
          description="作品にいいねされた時に通知を受け取ります"
          checked={settings.like_notification}
          onChange={(checked) => handleUpdateSetting('like_notification', checked)}
        />
        
        <div className="border-t border-gray-200 my-3" />
        
        <SettingToggle
          id="commentNotification"
          label="コメント通知"
          description="作品にコメントされた時に通知を受け取ります"
          checked={settings.comment_notification}
          onChange={(checked) => handleUpdateSetting('comment_notification', checked)}
        />
        
        <div className="border-t border-gray-200 my-3" />
        
        <SettingToggle
          id="followNotification"
          label="フォロー通知"
          description="フォローされた時に通知を受け取ります"
          checked={settings.follow_notification}
          onChange={(checked) => handleUpdateSetting('follow_notification', checked)}
        />
        
        <div className="border-t border-gray-200 my-3" />
        
        <SettingToggle
          id="emailNotification"
          label="メール通知"
          description="重要な通知をメールでも受け取ります"
          checked={settings.email_notification}
          onChange={(checked) => handleUpdateSetting('email_notification', checked)}
        />
      </div>
    </div>
  )
}