import { getAuthenticatedUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { 
  getUserWithStats, 
  getUserSeries,
  UserProfileSection
} from '@/features/users'
import { ProfileSuspense } from '@/features/users/sections/ProfileSuspense'

export default async function ProfilePage() {
  const user = await getAuthenticatedUser()

  // ログインしていない場合はログインページにリダイレクト
  if (!user) {
    redirect('/auth/login')
  }

  // 🚀 段階的読み込み: ユーザー情報を先に表示、作品データは後で読み込み
  const [userWithStats, userSeries] = await Promise.all([
    getUserWithStats(user.id),
    getUserSeries(user.id)  // シリーズ情報は軽量なので先に取得
  ])
  
  if (!userWithStats) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* プロフィールセクション - 即座に表示 */}
        <UserProfileSection
          user={userWithStats}
          currentUserId={user.id}
        />

        {/* タブセクション - Suspense で段階的読み込み */}
        <ProfileSuspense 
          user={userWithStats}
          currentUserId={user.id}
          userSeries={userSeries}
        />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'プロフィール - Bunshare',
  description: 'あなたのプロフィールページです。'
}