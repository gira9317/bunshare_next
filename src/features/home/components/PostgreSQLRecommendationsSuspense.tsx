import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPostgreSQLRecommendations } from '../server/postgres-recommendations'
import { PostgreSQLRecommendationsSection } from '../sections/PostgreSQLRecommendationsSection'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

/**
 * ユーザーのいいね・ブックマーク・読書進捗を統合取得
 */
async function getUserInteractionData(userId: string) {
  try {
    const supabase = await createClient()
    
    // 1回のクエリでユーザーデータを効率的に取得
    const [likesResult, bookmarksResult, progressResult] = await Promise.all([
      supabase.from('likes').select('work_id').eq('user_id', userId),
      supabase.from('bookmarks').select('work_id').eq('user_id', userId),
      supabase.from('reading_progress').select('work_id, progress_percentage').eq('user_id', userId)
    ])

    return {
      userLikes: likesResult.data?.map(like => like.work_id) || [],
      userBookmarks: bookmarksResult.data?.map(bookmark => bookmark.work_id) || [],
      userReadingProgress: progressResult.data?.reduce((acc, progress) => {
        acc[progress.work_id] = progress.progress_percentage
        return acc
      }, {} as Record<string, number>) || {}
    }
  } catch (error) {
    console.error('ユーザーデータ取得エラー:', error)
    return {
      userLikes: [],
      userBookmarks: [],
      userReadingProgress: {}
    }
  }
}

interface PostgreSQLRecommendationsSuspenseProps {
  userId?: string
}

async function PostgreSQLRecommendationsContent({ userId }: PostgreSQLRecommendationsSuspenseProps) {
  // PostgreSQL推薦システムから取得
  const [recommendationsResult, userData] = await Promise.all([
    getPostgreSQLRecommendations(userId, 20),
    userId ? getUserInteractionData(userId) : Promise.resolve({
      userLikes: [],
      userBookmarks: [],
      userReadingProgress: {}
    })
  ])
  
  // エラーハンドリング
  if ('error' in recommendationsResult) {
    return (
      <div className="py-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          あなたへのおすすめ
        </h2>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>おすすめを読み込めませんでした</p>
          <p className="text-sm mt-2">PostgreSQL推薦システムエラー</p>
        </div>
      </div>
    )
  }

  // タイトルを固定
  const sectionTitle = 'あなたへのおすすめ'

  return (
    <div>
      <PostgreSQLRecommendationsSection
        recommendations={recommendationsResult}
        userLikes={userData.userLikes}
        userBookmarks={userData.userBookmarks}
        userReadingProgress={userData.userReadingProgress}
        title={sectionTitle}
      />
    </div>
  )
}

export function PostgreSQLRecommendationsSuspense({ userId }: PostgreSQLRecommendationsSuspenseProps) {
  return (
    <Suspense fallback={<LoadingSpinner size="sm" text="PostgreSQL推薦を読み込み中..." />}>
      <PostgreSQLRecommendationsContent userId={userId} />
    </Suspense>
  )
}