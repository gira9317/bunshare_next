'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  BookOpen, 
  Heart, 
  FolderOpen, 
  Settings, 
  Clock, 
  Edit3
} from 'lucide-react'
import { UserWork } from '../schemas'
import { WorkCard } from '@/components/domain/WorkCard'
import { AccountSettingsCard } from '../leaf/AccountSettingsCard'

interface UserLibrarySectionProps {
  works: UserWork[]
  likedWorks?: any[]
  bookmarks?: any[]
  viewHistory?: any[]
  drafts?: any[]
  user?: any
  className?: string
  isOwnProfile?: boolean
}

type TabType = 'works' | 'management' | 'folders' | 'liked' | 'history' | 'settings'

export function UserLibrarySection({ 
  works, 
  likedWorks = [],
  bookmarks = [],
  viewHistory = [],
  drafts = [],
  user,
  className,
  isOwnProfile = false
}: UserLibrarySectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('works')

  const tabs = [
    {
      id: 'works' as const,
      label: '投稿作品一覧',
      icon: BookOpen,
      count: works.length,
      content: works,
      description: '公開済みの作品'
    },
    {
      id: 'management' as const,
      label: '作品管理',
      icon: Edit3,
      count: drafts.length,
      content: drafts,
      description: '下書き・非公開作品'
    },
    {
      id: 'folders' as const,
      label: 'ブックマークフォルダ',
      icon: FolderOpen,
      count: bookmarks.length,
      content: bookmarks,
      description: 'しおりした作品'
    },
    {
      id: 'liked' as const,
      label: 'いいねした作品',
      icon: Heart,
      count: likedWorks.length,
      content: likedWorks,
      description: 'お気に入りの作品'
    },
    {
      id: 'history' as const,
      label: '閲覧履歴',
      icon: Clock,
      count: viewHistory.length,
      content: viewHistory,
      description: '最近読んだ作品'
    },
    {
      id: 'settings' as const,
      label: '設定',
      icon: Settings,
      count: 0,
      content: [],
      description: 'アカウント設定'
    }
  ]

  // 自分のプロフィールでない場合は投稿作品のみ表示
  const visibleTabs = isOwnProfile ? tabs : tabs.filter(tab => tab.id === 'works')

  const renderContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab)
    const content = activeTabData?.content || []

    // 設定タブの場合は特別なコンテンツを表示
    if (activeTab === 'settings') {
      return user ? <AccountSettingsCard user={user} /> : null
    }

    if (content.length === 0) {
      const emptyStates = {
        works: {
          icon: '📝',
          message: 'まだ作品がありません',
          description: 'このユーザーはまだ作品を投稿していません。'
        },
        management: {
          icon: '✍️',
          message: '管理する作品がありません',
          description: '下書きや非公開作品はありません。'
        },
        folders: {
          icon: '🔖',
          message: 'まだしおりがありません',
          description: 'お気に入りの作品をしおりに追加してみましょう。'
        },
        liked: {
          icon: '❤️',
          message: 'まだいいねした作品がありません',
          description: 'お気に入りの作品にいいねしてみましょう。'
        },
        history: {
          icon: '📖',
          message: '閲覧履歴がありません',
          description: '作品を読むと履歴が表示されます。'
        },
        settings: {
          icon: '⚙️',
          message: '設定',
          description: 'アカウントの設定を管理できます。'
        }
      }

      const emptyState = emptyStates[activeTab] || emptyStates.works

      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">{emptyState.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {emptyState.message}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {emptyState.description}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {content.map((item: any, index: number) => (
          <WorkCard
            key={item.work_id || index}
            work={{
              work_id: item.work_id || `item-${index}`,
              title: item.title || 'タイトル未設定',
              description: item.description || '',
              category: item.category || 'その他',
              author: item.author || 'あなた',
              likes: item.likes_count || 0,
              comments: item.comments_count || 0,
              views: item.views_count || 0,
              created_at: item.created_at || new Date().toISOString(),
              image_url: item.image_url
            }}
            isLiked={false}
            isBookmarked={false}
            disableContinueDialog={true}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex overflow-x-auto scrollbar-hide space-x-1 sm:space-x-8" aria-label="Tabs">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group inline-flex items-center gap-2 py-4 px-3 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    'ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    activeTab === tab.id
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Description */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {tabs.find(tab => tab.id === activeTab)?.description}
      </div>

      {/* Tab Content */}
      {renderContent()}
    </div>
  )
}