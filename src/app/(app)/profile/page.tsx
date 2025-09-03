import { getAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { 
  getUserWithStats, 
  getUserWorks,
  getUserPublishedWorks,
  getUserDraftWorks,
  getUserLikedWorks,
  getUserBookmarkedWorks,
  UserProfileSection,
  UserWorksSection,
  UserStatsSection
} from '@/features/users'
import { 
  ProfileTabsSection,
  DashboardTabContent,
  WorksTabContent,
  LibraryTabContent,
  SettingsTabContent
} from '@/features/users/sections/ProfileTabsSection'

export default async function ProfilePage() {
  const user = await getAuthenticatedUser()

  // ログインしていない場合はログインページにリダイレクト
  if (!user) {
    redirect('/auth/login')
  }

  // ユーザー情報と統計を取得
  const userWithStats = await getUserWithStats(user.id)
  if (!userWithStats) {
    redirect('/auth/login')
  }

  // ユーザーの作品を取得
  const [publishedWorks, draftWorks, likedWorks, bookmarkedWorks] = await Promise.all([
    getUserPublishedWorks(user.id, 12),
    getUserDraftWorks(user.id),
    getUserLikedWorks(user.id),
    getUserBookmarkedWorks(user.id)
  ])

  // タブの定義
  const tabs = [
    {
      id: 'dashboard',
      label: '投稿作品一覧',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      content: <DashboardTabContent user={userWithStats} publishedWorks={publishedWorks} />
    },
    {
      id: 'works',
      label: '作品管理',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      content: <WorksTabContent user={userWithStats} publishedWorks={publishedWorks} draftWorks={draftWorks} />
    },
    {
      id: 'library',
      label: 'ライブラリ',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      content: <LibraryTabContent user={userWithStats} likedWorks={likedWorks} bookmarkedWorks={bookmarkedWorks} />
    },
    {
      id: 'settings',
      label: '設定',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      content: <SettingsTabContent user={userWithStats} currentUserId={user.id} />
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* プロフィールセクション */}
        <UserProfileSection
          user={userWithStats}
          currentUserId={user.id}
        />

        {/* タブセクション */}
        <ProfileTabsSection
          user={userWithStats}
          currentUserId={user.id}
          tabs={tabs}
          defaultTab="dashboard"
        />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'プロフィール - Bunshare',
  description: 'あなたのプロフィールページです。'
}