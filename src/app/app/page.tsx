import { getAuthenticatedUser } from '@/lib/auth'
import { ContinueReadingSuspense } from '@/features/home/components/ContinueReadingSuspense'
import { PostgreSQLRecommendationsSuspense } from '@/features/home/components/PostgreSQLRecommendationsSuspense'
import { NovelsSuspense } from '@/features/home/components/NovelsSuspense'
import { EssaysSuspense } from '@/features/home/components/EssaysSuspense'
import { UserTagsSuspense } from '@/features/home/components/UserTagsSuspense'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Suspense } from 'react'

// 動的レンダリングを強制（認証とクッキーを使用するため）
export const dynamic = 'force-dynamic'

async function HomePage() {
  // 認証確認のみをサーバーサイドで実行
  const user = await getAuthenticatedUser()

  return (
    <Suspense fallback={<LoadingSpinner text="ページを読み込み中..." />}>
      <div className="space-y-8">
        {/* 続きを読むセクション - ユーザーがいる場合のみ */}
        {user && <ContinueReadingSuspense userId={user.id} />}
        
        {/* おすすめセクション - 全ユーザー対応（PostgreSQL推薦） */}
        <PostgreSQLRecommendationsSuspense userId={user?.id} />
        
        {/* 小説セクション */}
        <NovelsSuspense userId={user?.id} />
        
        {/* エッセイセクション */}
        <EssaysSuspense userId={user?.id} />
        
        {/* ユーザータグセクション */}
        <UserTagsSuspense userId={user?.id} />
        
      </div>
    </Suspense>
  )
}

export default HomePage