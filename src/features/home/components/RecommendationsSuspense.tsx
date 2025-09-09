import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getRecommendationsAction } from '../server/recommendations'
import { RecommendationsSection } from '../sections/RecommendationsSection'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface RecommendationsSuspenseProps {
  userId?: string
}

async function RecommendationsContent({ userId }: RecommendationsSuspenseProps) {
  const recommendationsResult = await getRecommendationsAction(userId)
  
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

  // ユーザーがいる場合、いいね・ブックマーク・読書進捗を取得
  let userLikes: string[] = []
  let userBookmarks: string[] = []
  let userReadingProgress: Record<string, number> = {}

  if (userId) {
    try {
      const supabase = await createClient()
      
      const [likesResult, bookmarksResult, progressResult] = await Promise.all([
        supabase.from('likes').select('work_id').eq('user_id', userId),
        supabase.from('bookmarks').select('work_id').eq('user_id', userId),
        supabase.from('reading_bookmarks').select('work_id, reading_progress').eq('user_id', userId)
      ])

      userLikes = likesResult.data?.map(like => like.work_id) || []
      userBookmarks = bookmarksResult.data?.map(bookmark => bookmark.work_id) || []
      userReadingProgress = progressResult.data?.reduce((acc, progress) => {
        acc[progress.work_id] = progress.reading_progress
        return acc
      }, {} as Record<string, number>) || {}
    } catch (error) {
      console.error('ユーザーデータ取得エラー:', error)
      // エラーでも推薦は表示する
    }
  }

  return (
    <RecommendationsSection
      recommendations={recommendationsResult}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      userReadingProgress={userReadingProgress}
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