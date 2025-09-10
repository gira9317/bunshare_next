import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getRecommendationsAction } from '../server/recommendations'
import { RecommendationsSection } from '../sections/RecommendationsSection'
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

interface RecommendationsSuspenseProps {
  userId?: string
}

async function RecommendationsContent({ userId }: RecommendationsSuspenseProps) {
  // 推薦取得とユーザーデータ取得を並行実行
  const [recommendationsResult, userData] = await Promise.all([
    getRecommendationsAction(userId),
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
        </div>
      </div>
    )
  }

  return (
    <RecommendationsSection
      recommendations={recommendationsResult}
      userLikes={userData.userLikes}
      userBookmarks={userData.userBookmarks}
      userReadingProgress={userData.userReadingProgress}
    />
  )
}

export function RecommendationsSuspense({ userId }: RecommendationsSuspenseProps) {
  return (
    <Suspense fallback={<LoadingSpinner size="sm" text="おすすめ作品を読み込み中..." />}>
      <RecommendationsContent userId={userId} />
    </Suspense>
  )
}