import { getAuthenticatedUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { 
  getUserWithStats, 
  getUserWorks,
  canViewProfile,
  isFollowing,
  isFollowPending,
  UserProfileSection,
  UserWorksSection,
  UserStatsSection
} from '@/features/users'

interface ProfilePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const currentUser = await getAuthenticatedUser()

  // ユーザー情報を取得
  const userWithStats = await getUserWithStats(id)
  if (!userWithStats) {
    notFound()
  }

  // プロフィールを閲覧できるかチェック
  const canView = await canViewProfile(currentUser?.id || null, id)
  if (!canView) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            非公開プロフィール
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            このユーザーは自身のプロフィールを非公開に設定しています。
          </p>
        </div>
      </div>
    )
  }

  // フォロー状態を取得（ログインユーザーがいる場合）
  let followingStatus = false
  let pendingStatus = false
  
  if (currentUser && currentUser.id !== id) {
    followingStatus = await isFollowing(currentUser.id, id)
    pendingStatus = await isFollowPending(currentUser.id, id)
  }

  // ユーザーの作品を取得
  const works = await getUserWorks(id, 10, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* プロフィールセクション */}
        <UserProfileSection
          user={userWithStats}
          currentUserId={currentUser?.id}
          isFollowing={followingStatus}
          isPending={pendingStatus}
        />

        {/* 統計セクション（公開プロフィールまたは自分の場合） */}
        {(userWithStats.is_public || currentUser?.id === id) && (
          <UserStatsSection stats={userWithStats.stats} />
        )}

        {/* 作品セクション */}
        <UserWorksSection works={works} />
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params
  const userWithStats = await getUserWithStats(id)
  
  if (!userWithStats) {
    return {
      title: 'ユーザーが見つかりません - Bunshare',
    }
  }

  const displayName = userWithStats.display_name || userWithStats.username

  return {
    title: `${displayName} (@${userWithStats.username}) - Bunshare`,
    description: userWithStats.bio || `${displayName}のプロフィールページです。`,
    openGraph: {
      title: `${displayName} (@${userWithStats.username})`,
      description: userWithStats.bio || `${displayName}のプロフィール`,
      images: userWithStats.avatar_url ? [userWithStats.avatar_url] : [],
    },
  }
}