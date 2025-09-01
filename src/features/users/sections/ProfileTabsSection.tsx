'use client'

import { useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { UserWithStats } from '../schemas'

interface Tab {
  id: string
  label: string
  icon: ReactNode
  content: ReactNode
}

interface ProfileTabsSectionProps {
  user: UserWithStats
  currentUserId?: string | null
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

export function ProfileTabsSection({ 
  user,
  currentUserId,
  tabs,
  defaultTab,
  className 
}: ProfileTabsSectionProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTabContent}
      </div>
    </div>
  )
}

// Tab content components
export function DashboardTabContent({ user }: { user: UserWithStats }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        📚 投稿作品一覧
      </h2>
      <div className="grid gap-4">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          まだ投稿された作品がありません
        </div>
      </div>
    </div>
  )
}

export function WorksTabContent({ user }: { user: UserWithStats }) {
  const [activeWorksTab, setActiveWorksTab] = useState('published')

  const worksTabOptions = [
    { id: 'published', label: '📚 投稿済みシリーズ' },
    { id: 'works', label: '📝 投稿済み作品' },
    { id: 'scheduled', label: '⏰ 予約投稿' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          ✍️ 作品管理
        </h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          ✨ 新規作品
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-6">
          {worksTabOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveWorksTab(option.id)}
              className={cn(
                'py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                activeWorksTab === option.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {activeWorksTab === 'published' && 'まだシリーズがありません'}
        {activeWorksTab === 'works' && 'まだ投稿された作品がありません'}
        {activeWorksTab === 'scheduled' && '予約投稿された作品がありません'}
      </div>
    </div>
  )
}

export function LibraryTabContent({ user }: { user: UserWithStats }) {
  const [activeLibraryTab, setActiveLibraryTab] = useState('liked')

  const libraryTabOptions = [
    { id: 'liked', label: '❤️ いいねした作品', count: 0 },
    { id: 'bookmarked', label: '🔖 ブックマーク', count: user.stats.bookmarks_count },
    { id: 'history', label: '📖 閲覧履歴', count: 0 }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        📚 ライブラリ
      </h2>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-6">
          {libraryTabOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveLibraryTab(option.id)}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                activeLibraryTab === option.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <span>{option.label}</span>
              {option.count > 0 && (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {activeLibraryTab === 'liked' && 'いいねした作品がありません'}
        {activeLibraryTab === 'bookmarked' && 'ブックマークした作品がありません'}
        {activeLibraryTab === 'history' && '閲覧履歴がありません'}
      </div>
    </div>
  )
}

export function SettingsTabContent({ user, currentUserId }: { user: UserWithStats; currentUserId?: string | null }) {
  const isOwnProfile = currentUserId === user.id

  if (!isOwnProfile) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        設定は自分のプロフィールでのみ表示されます
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        ⚙️ 設定
      </h2>

      {/* Privacy Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          🔒 プライバシー設定
        </h3>
        <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                プロフィール公開
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                他のユーザーがあなたのプロフィールを閲覧できます
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={user.is_public}
                className="sr-only"
                readOnly
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                user.is_public ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              )}>
                <div className={cn(
                  'w-5 h-5 bg-white rounded-full shadow transform transition-transform',
                  user.is_public ? 'translate-x-5' : 'translate-x-0',
                  'mt-0.5 ml-0.5'
                )} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                フォロー許可制
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                フォローリクエストを承認制にします
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={user.follow_approval_required}
                className="sr-only"
                readOnly
              />
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors',
                user.follow_approval_required ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              )}>
                <div className={cn(
                  'w-5 h-5 bg-white rounded-full shadow transform transition-transform',
                  user.follow_approval_required ? 'translate-x-5' : 'translate-x-0',
                  'mt-0.5 ml-0.5'
                )} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          🔧 アカウント設定
        </h3>
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                📧 メールアドレス変更
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                🔑 パスワード変更
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}