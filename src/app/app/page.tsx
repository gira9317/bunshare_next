import { getAuthenticatedUser } from '@/lib/auth'
import { ContinueReadingSuspense } from '@/features/home/components/ContinueReadingSuspense'
import { PostgreSQLRecommendationsSuspense } from '@/features/home/components/PostgreSQLRecommendationsSuspense'
import { NovelsSuspense } from '@/features/home/components/NovelsSuspense'
import { EssaysSuspense } from '@/features/home/components/EssaysSuspense'
import { UserTagsSuspense } from '@/features/home/components/UserTagsSuspense'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { RecommendationsSkeleton } from '@/components/shared/RecommendationsSkeleton'
import { Suspense } from 'react'

async function HomePage() {
  // 認証確認のみをサーバーサイドで実行
  const user = await getAuthenticatedUser()

  return (
    <div className="space-y-8">
      {/* 続きを読むセクション - ユーザーがいる場合のみ */}
      {user && (
        <Suspense fallback={<LoadingSpinner size="sm" text="続きから読む作品を読み込み中..." />}>
          <ContinueReadingSuspense userId={user.id} />
        </Suspense>
      )}
      
      {/* おすすめセクション - 全ユーザー対応（PostgreSQL推薦） */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <PostgreSQLRecommendationsSuspense userId={user?.id} />
      </Suspense>
      
      {/* 小説セクション */}
      <Suspense fallback={<LoadingSpinner text="小説を読み込み中..." />}>
        <NovelsSuspense userId={user?.id} />
      </Suspense>
      
      {/* エッセイセクション */}
      <Suspense fallback={<LoadingSpinner text="エッセイを読み込み中..." />}>
        <EssaysSuspense userId={user?.id} />
      </Suspense>
      
      {/* ユーザータグセクション */}
      <UserTagsSuspense userId={user?.id} />
      
    </div>
  )
}

export default HomePage