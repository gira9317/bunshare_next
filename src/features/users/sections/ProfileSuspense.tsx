import { Suspense } from 'react'
import { FileText, PenTool, Library, Settings } from 'lucide-react'
import { UserWithStats } from '../schemas'
import { 
  ProfileTabsSection,
  DashboardTabContent,
  WorksTabContent,
  LibraryTabContent,
  SettingsTabContent
} from './ProfileTabsSection'
import { 
  getUserPublishedWorks,
  getUserDraftWorks, 
  getUserLikedWorks,
  getUserBookmarkedWorks
} from '../server/loader'
import { getUserLikesAndBookmarks, getUserReadingHistory } from '@/features/works/server/loader'
import type { Series } from '../schemas'

interface ProfileSuspenseProps {
  user: UserWithStats
  currentUserId: string
  userSeries: Series[]
  defaultTab?: string
}

// 作品データをSuspense境界で遅延読み込み
async function WorksDataLoader({ user, currentUserId, userSeries, defaultTab }: ProfileSuspenseProps) {
  try {
    const [publishedWorks, draftWorks, likedWorks, bookmarkedWorks, readingHistory, likesAndBookmarks] = await Promise.all([
      getUserPublishedWorks(user.id, 12),
      getUserDraftWorks(user.id),
      getUserLikedWorks(user.id),
      getUserBookmarkedWorks(user.id),
      getUserReadingHistory(user.id, 6, 0).catch(() => []), // エラー時は空配列を返す
      getUserLikesAndBookmarks(currentUserId) // 現在のユーザーのいいね状態を取得
    ])
  
  const { userLikes, userBookmarks } = likesAndBookmarks

  const tabs = [
    {
      id: 'dashboard',
      label: '投稿作品一覧', 
      icon: <FileText className="w-5 h-5" />,
      content: <DashboardTabContent user={user} publishedWorks={publishedWorks} userLikes={userLikes} userBookmarks={userBookmarks} />
    },
    {
      id: 'works',
      label: '作品管理',
      icon: <PenTool className="w-5 h-5" />,
      content: <WorksTabContent user={user} publishedWorks={publishedWorks} draftWorks={draftWorks} userSeries={userSeries} userLikes={userLikes} userBookmarks={userBookmarks} />
    },
    {
      id: 'library', 
      label: 'ライブラリ',
      icon: <Library className="w-5 h-5" />,
      content: <LibraryTabContent user={user} likedWorks={likedWorks} bookmarkedWorks={bookmarkedWorks} readingHistory={readingHistory} />
    },
    {
      id: 'settings',
      label: '設定',
      icon: <Settings className="w-5 h-5" />,
      content: <SettingsTabContent user={user} currentUserId={currentUserId} />
    }
  ]

    return (
      <ProfileTabsSection
        user={user}
        currentUserId={currentUserId}
        tabs={tabs}
        defaultTab={defaultTab || "dashboard"}
      />
    )
  } catch (error) {
    console.error('WorksDataLoader エラー:', error)
    // エラー時は閲覧履歴なしでフォールバック
    const [publishedWorks, draftWorks, likedWorks, bookmarkedWorks, likesAndBookmarks] = await Promise.all([
      getUserPublishedWorks(user.id, 12),
      getUserDraftWorks(user.id),
      getUserLikedWorks(user.id),
      getUserBookmarkedWorks(user.id),
      getUserLikesAndBookmarks(currentUserId)
    ])
    
    const { userLikes, userBookmarks } = likesAndBookmarks

    const tabs = [
      {
        id: 'dashboard',
        label: '投稿作品一覧', 
        icon: <FileText className="w-5 h-5" />,
        content: <DashboardTabContent user={user} publishedWorks={publishedWorks} userLikes={userLikes} userBookmarks={userBookmarks} />
      },
      {
        id: 'works',
        label: '作品管理',
        icon: <PenTool className="w-5 h-5" />,
        content: <WorksTabContent user={user} publishedWorks={publishedWorks} draftWorks={draftWorks} userSeries={userSeries} userLikes={userLikes} userBookmarks={userBookmarks} />
      },
      {
        id: 'library', 
        label: 'ライブラリ',
        icon: <Library className="w-5 h-5" />,
        content: <LibraryTabContent user={user} likedWorks={likedWorks} bookmarkedWorks={bookmarkedWorks} readingHistory={[]} />
      },
      {
        id: 'settings',
        label: '設定',
        icon: <Settings className="w-5 h-5" />,
        content: <SettingsTabContent user={user} currentUserId={currentUserId} />
      }
    ]

    return (
      <ProfileTabsSection
        user={user}
        currentUserId={currentUserId}
        tabs={tabs}
        defaultTab={defaultTab || "dashboard"}
      />
    )
  }
}

// スケルトン UI
function ProfileTabsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* タブヘッダー */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 px-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="py-4 px-1 border-b-2 border-transparent">
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            </div>
          ))}
        </nav>
      </div>
      
      {/* タブコンテンツ - スピナーを中央に表示 */}
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          {/* スピナー */}
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-purple-600 dark:border-purple-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">作品を読み込み中...</p>
        </div>
        
        {/* オプション: カードのスケルトンも薄く表示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-30 mt-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="h-32 w-full bg-gray-200 dark:bg-gray-600 rounded mb-4 animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-600 rounded mb-2 animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProfileSuspense({ user, currentUserId, userSeries, defaultTab }: ProfileSuspenseProps) {
  return (
    <Suspense fallback={<ProfileTabsSkeleton />}>
      <WorksDataLoader user={user} currentUserId={currentUserId} userSeries={userSeries} defaultTab={defaultTab} />
    </Suspense>
  )
}