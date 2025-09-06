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
import { FileText, PenTool, Library, Cog } from 'lucide-react'

export default async function ProfilePage() {
  const user = await getAuthenticatedUser()

  // ログインしていない場合はログインページにリダイレクト
  if (!user) {
    redirect('/auth/login')
  }

  // ユーザー情報と統計、作品データを並列取得して最適化
  const [userWithStats, worksData] = await Promise.all([
    getUserWithStats(user.id),
    Promise.all([
      getUserPublishedWorks(user.id, 12),
      getUserDraftWorks(user.id),
      getUserLikedWorks(user.id),
      getUserBookmarkedWorks(user.id)
    ])
  ])
  
  if (!userWithStats) {
    redirect('/auth/login')
  }

  const [publishedWorks, draftWorks, likedWorks, bookmarkedWorks] = worksData

  // タブの定義
  const tabs = [
    {
      id: 'dashboard',
      label: '投稿作品一覧',
      icon: <FileText className="w-5 h-5" />,
      content: <DashboardTabContent user={userWithStats} publishedWorks={publishedWorks} />
    },
    {
      id: 'works',
      label: '作品管理',
      icon: <PenTool className="w-5 h-5" />,
      content: <WorksTabContent user={userWithStats} publishedWorks={publishedWorks} draftWorks={draftWorks} />
    },
    {
      id: 'library',
      label: 'ライブラリ',
      icon: <Library className="w-5 h-5" />,
      content: <LibraryTabContent user={userWithStats} likedWorks={likedWorks} bookmarkedWorks={bookmarkedWorks} />
    },
    {
      id: 'settings',
      label: '設定',
      icon: <Cog className="w-5 h-5" />,
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