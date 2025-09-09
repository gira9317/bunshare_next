import { getAuthenticatedUser } from '@/lib/auth'
import { CategoryChipsClient } from '@/features/home/leaf/CategoryChipsClient'
import { ContinueReadingSuspense } from '@/features/home/components/ContinueReadingSuspense'
import { RecommendationsSuspense } from '@/features/home/components/RecommendationsSuspense'
import { WorksFeedSuspense } from '@/features/home/components/WorksFeedSuspense'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Suspense } from 'react'

async function HomePage() {
  // 認証確認のみをサーバーサイドで実行
  const user = await getAuthenticatedUser()

  return (
    <div className="space-y-8">
      {/* カテゴリチップス - 即座に表示 */}
      <CategoryChipsClient />
      
      {/* 続きを読むセクション - ユーザーがいる場合のみ */}
      {user && (
        <Suspense fallback={<LoadingSpinner size="sm" text="続きから読む作品を読み込み中..." />}>
          <ContinueReadingSuspense userId={user.id} />
        </Suspense>
      )}
      
      {/* おすすめセクション - 全ユーザー対応 */}
      <Suspense fallback={<LoadingSpinner size="sm" text="おすすめ作品を読み込み中..." />}>
        <RecommendationsSuspense userId={user?.id} />
      </Suspense>
      
      {/* 作品フィード - 段階的に読み込み */}
      <Suspense fallback={<LoadingSpinner text="作品を読み込み中..." />}>
        <WorksFeedSuspense userId={user?.id} />
      </Suspense>
    </div>
  )
}

export default HomePage