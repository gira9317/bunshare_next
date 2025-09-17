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
    getUserSeries(user.id)  // シリーズ情報は軽量なので先に取得
  ])
  
  if (!userWithStats) {
    redirect('/auth/login')
  }

  // URLパラメータからタブを取得（デフォルトは'dashboard'）
  const defaultTab = params.tab || 'dashboard'

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
          defaultTab={defaultTab}
        />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'プロフィール - Bunshare',
  description: 'あなたのプロフィールページです。'
}