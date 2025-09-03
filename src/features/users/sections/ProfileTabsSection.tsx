'use client'

import { useState, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { UserWithStats } from '../schemas'
import { WorkCard } from '@/components/domain/WorkCard'
import type { Work } from '@/features/works/types'
import { BookmarkFolderManager } from '../leaf/BookmarkFolderManager'
import { getBookmarkFoldersAction, getBookmarksByFolderAction } from '@/features/works/server/actions'
import { Folder, ArrowLeft, Settings } from 'lucide-react'

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
      {/* Tab Navigation - Mobile first */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                'whitespace-nowrap flex-shrink-0', // Prevent text wrapping
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.label === '投稿作品一覧' ? '作品' : 
                 tab.label === '作品管理' ? '管理' :
                 tab.label === 'ライブラリ' ? 'ライブラリ' : '設定'}
              </span>
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
export function DashboardTabContent({ user, publishedWorks }: { user: UserWithStats; publishedWorks: Work[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        📚 投稿作品一覧
      </h2>
      {publishedWorks.length > 0 ? (
        <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {publishedWorks.map((work) => (
            <WorkCard
              key={work.work_id}
              work={work}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          まだ投稿された作品がありません
        </div>
      )}
    </div>
  )
}

export function WorksTabContent({ user, publishedWorks, draftWorks }: { user: UserWithStats; publishedWorks: Work[]; draftWorks: Work[] }) {
  const [activeWorksTab, setActiveWorksTab] = useState('published')

  const worksTabOptions = [
    { id: 'published', label: '📚 投稿済みシリーズ' },
    { id: 'works', label: '📝 投稿済み作品' },
    { id: 'scheduled', label: '⏰ 予約投稿' }
  ]

  const renderWorksGrid = () => {
    let works: Work[] = []
    
    if (activeWorksTab === 'works') {
      works = publishedWorks
    } else if (activeWorksTab === 'published') {
      // For series, we could group by series_id, but for now show published works
      works = publishedWorks.filter(work => work.series_id)
    } else if (activeWorksTab === 'scheduled') {
      // For scheduled works, we would need a separate query
      works = []
    }

    if (works.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {activeWorksTab === 'published' && 'まだシリーズがありません'}
          {activeWorksTab === 'works' && 'まだ投稿された作品がありません'}
          {activeWorksTab === 'scheduled' && '予約投稿された作品がありません'}
        </div>
      )
    }

    return (
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {works.map((work) => (
          <WorkCard
            key={work.work_id}
            work={work}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          ✍️ 作品管理
        </h2>
        <button className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap">
          <span className="hidden sm:inline">✨ 新規作品</span>
          <span className="sm:hidden">✨ 新規</span>
        </button>
      </div>

      {/* Sub-tabs - Mobile first */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-hide">
          {worksTabOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveWorksTab(option.id)}
              className={cn(
                'py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                'whitespace-nowrap flex-shrink-0',
                activeWorksTab === option.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <span className="hidden sm:inline">{option.label}</span>
              <span className="sm:hidden">
                {option.label.includes('シリーズ') ? '📚 シリーズ' :
                 option.label.includes('作品') ? '📝 作品' : '⏰ 予約'}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {renderWorksGrid()}
    </div>
  )
}

interface BookmarkFolder {
  id: string
  folder_key: string
  folder_name: string
  is_private: boolean
  is_system: boolean
  sort_order?: number
}

export function LibraryTabContent({ user, likedWorks, bookmarkedWorks }: { user: UserWithStats; likedWorks: Work[]; bookmarkedWorks: Work[] }) {
  const [activeLibraryTab, setActiveLibraryTab] = useState('liked')
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [showFolderManager, setShowFolderManager] = useState(false)
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([])
  const [folderWorks, setFolderWorks] = useState<Work[]>([])
  const [showFolderList, setShowFolderList] = useState(true)
  const [loading, setLoading] = useState(false)

  // ブックマークフォルダとフォルダ別作品を読み込み
  useEffect(() => {
    if (activeLibraryTab === 'bookmarked') {
      loadBookmarkFolders()
    }
  }, [activeLibraryTab])

  const loadBookmarkFolders = async () => {
    setLoading(true)
    try {
      const result = await getBookmarkFoldersAction()
      if (result.success) {
        setBookmarkFolders(result.folders.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      }
    } catch (error) {
      console.error('フォルダ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFolderWorks = async (folderKey: string) => {
    setLoading(true)
    try {
      const result = await getBookmarksByFolderAction(folderKey)
      if (result.success) {
        setFolderWorks(result.works)
        setSelectedFolder(folderKey)
        setShowFolderList(false)
      }
    } catch (error) {
      console.error('フォルダ作品読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const libraryTabOptions = [
    { id: 'liked', label: '❤️ いいねした作品', count: likedWorks.length },
    { id: 'bookmarked', label: '🔖 ブックマーク', count: bookmarkedWorks.length },
    { id: 'history', label: '📖 閲覧履歴', count: 0 }
  ]

  const renderBookmarkFolders = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">読み込み中...</span>
        </div>
      )
    }

    if (bookmarkFolders.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Folder size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-2">フォルダがありません</p>
          <p className="text-sm">「フォルダ管理」からフォルダを作成してください</p>
        </div>
      )
    }

    // 「すべて」フォルダを最初に追加
    const allFolder = {
      id: 'all',
      folder_key: 'all',
      folder_name: 'すべてのブックマーク',
      is_private: false,
      is_system: false,
      sort_order: 0
    }

    const foldersWithAll = [allFolder, ...bookmarkFolders]

    return (
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {foldersWithAll.map((folder) => (
          <button
            key={folder.folder_key}
            onClick={() => loadFolderWorks(folder.folder_key)}
            className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
              <Folder size={32} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-center">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {folder.folder_name}
              </h3>
              {folder.is_private && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                  プライベート
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  const renderFolderWorks = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">作品を読み込み中...</span>
        </div>
      )
    }

    if (folderWorks.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          このフォルダにはブックマークされた作品がありません
        </div>
      )
    }

    return (
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {folderWorks.map((work) => (
          <WorkCard
            key={work.work_id}
            work={work}
            isBookmarked={true}
          />
        ))}
      </div>
    )
  }

  const renderLibraryGrid = () => {
    let works: Work[] = []
    
    if (activeLibraryTab === 'liked') {
      works = likedWorks
    } else if (activeLibraryTab === 'bookmarked') {
      // ブックマークタブではフォルダ表示を優先
      if (showFolderList) {
        return renderBookmarkFolders()
      } else {
        return renderFolderWorks()
      }
    } else if (activeLibraryTab === 'history') {
      // For reading history, we would need a separate query
      works = []
    }

    if (works.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {activeLibraryTab === 'liked' && 'いいねした作品がありません'}
          {activeLibraryTab === 'history' && '閲覧履歴がありません'}
        </div>
      )
    }

    return (
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {works.map((work) => (
          <WorkCard
            key={work.work_id}
            work={work}
            isLiked={activeLibraryTab === 'liked'}
            isBookmarked={activeLibraryTab === 'bookmarked'}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeLibraryTab === 'bookmarked' && !showFolderList && (
            <button
              onClick={() => {
                setShowFolderList(true)
                setFolderWorks([])
                setSelectedFolder('all')
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              フォルダ一覧に戻る
            </button>
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {activeLibraryTab === 'bookmarked' && !showFolderList ? (
              <>
                📁 {selectedFolder === 'all' ? 'すべてのブックマーク' : 
                     bookmarkFolders.find(f => f.folder_key === selectedFolder)?.folder_name || 'フォルダ'}
              </>
            ) : (
              '📚 ライブラリ'
            )}
          </h2>
        </div>
        {activeLibraryTab === 'bookmarked' && showFolderList && (
          <button
            onClick={() => setShowFolderManager(!showFolderManager)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">フォルダ管理</span>
          </button>
        )}
      </div>

      {/* Sub-tabs - Mobile first */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-hide">
          {libraryTabOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setActiveLibraryTab(option.id)
                setShowFolderManager(false)
                setShowFolderList(true)
                setFolderWorks([])
                setSelectedFolder('all')
              }}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                'whitespace-nowrap flex-shrink-0',
                activeLibraryTab === option.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <span className="hidden sm:inline">{option.label}</span>
              <span className="sm:hidden">
                {option.label.includes('いいね') ? '❤️' :
                 option.label.includes('ブックマーク') ? '🔖' : '📖'}
              </span>
              {option.count > 0 && (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Folder Management Panel */}
      {showFolderManager && activeLibraryTab === 'bookmarked' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <BookmarkFolderManager
            userId={user.id}
            onFolderSelect={(folderKey) => {
              setSelectedFolder(folderKey)
              setShowFolderManager(false)
            }}
            selectedFolder={selectedFolder}
          />
        </div>
      )}

      {renderLibraryGrid()}
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
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
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