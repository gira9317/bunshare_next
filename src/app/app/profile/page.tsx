import { getAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { 
  getUserWithStats, 
  getUserSeries,
  UserProfileSection
} from '@/features/users'
import { ProfileSuspense } from '@/features/users/sections/ProfileSuspense'

// 動的レンダリングを強制（認証とクッキーを使用するため）
export const dynamic = 'force-dynamic'

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getAuthenticatedUser()

  // ログインしていない場合はログインページにリダイレクト
  if (!user) {
    redirect('/auth/login')
  }

  // searchParamsを解決
  const params = await searchParams

  // 🚀 段階的読み込み: ユーザー情報を先に表示、作品データは後で読み込み
  const [userWithStats, userSeries] = await Promise.all([
    getUserWithStats(user.id),
    getUserSeries(user.id)
  ])

  if (!userWithStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">プロフィールの読み込みに失敗しました</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* ユーザープロフィール */}
      <UserProfileSection 
        user={userWithStats}
        userSeries={userSeries || []}
        isOwnProfile={true}
        initialTab={params.tab}
      />
      
      {/* プロフィール詳細情報（サスペンス対応） */}
      <ProfileSuspense 
        user={userWithStats}
        currentUserId={user.id}
        userSeries={userSeries || []}
        defaultTab={params.tab}
      />
    </div>
  )
}