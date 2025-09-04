import { getAuthenticatedUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { 
  getUserProfile,
  canViewProfile,
} from '@/features/users'
import { FastProfileSuspense } from '@/features/users/components/FastProfileSuspense'
import { UserStatsSuspense } from '@/features/users/components/UserStatsSuspense'
import { UserWorksSuspense } from '@/features/users/components/UserWorksSuspense'
import { FollowStatusSuspense } from '@/features/users/components/FollowStatusSuspense'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ProfilePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const currentUser = await getAuthenticatedUser()

  // 基本的なユーザー情報のみ先に取得してチェック
  const user = await getUserProfile(id)
  if (!user) {
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

  const isOwnProfile = currentUser?.id === id
  const isPublicProfile = user.public_profile

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* プロフィールセクション - 即座に表示 */}
        <FastProfileSuspense
          user={user}
          currentUserId={currentUser?.id}
        />

        {/* フォロー状態は別途非同期で更新 */}
        {currentUser && !isOwnProfile && (
          <div className="hidden">
            <Suspense fallback={null}>
              <FollowStatusSuspense 
                currentUserId={currentUser.id} 
                targetUserId={id}
              >
                {() => null}
              </FollowStatusSuspense>
            </Suspense>
          </div>
        )}

        {/* 統計セクション - 段階的読み込み */}
        {(isPublicProfile || isOwnProfile) && (
          <Suspense fallback={<LoadingSpinner size="sm" text="統計情報を読み込み中..." />}>
            <UserStatsSuspense userId={id} />
          </Suspense>
        )}

        {/* 作品セクション - 段階的読み込み */}
        <Suspense fallback={<LoadingSpinner size="sm" text="作品一覧を読み込み中..." />}>
          <UserWorksSuspense userId={id} />
        </Suspense>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params
  const user = await getUserProfile(id)
  
  if (!user) {
    return {
      title: 'ユーザーが見つかりません - Bunshare',
    }
  }

  const displayName = user.username

  return {
    title: `${displayName} (@${user.username}) - Bunshare`,
    description: user.bio || `${displayName}のプロフィールページです。`,
    openGraph: {
      title: `${displayName} (@${user.username})`,
      description: user.bio || `${displayName}のプロフィール`,
      images: user.avatar_img_url ? [user.avatar_img_url] : [],
    },
  }
}