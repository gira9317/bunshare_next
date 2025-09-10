import { Suspense } from 'react'
import { UserTagsSection } from '../sections/UserTagsSection'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getCachedUserTagsRecommendations } from '../server/userTagsLoader'
import { createClient } from '@/lib/supabase/server'

interface UserTagsSuspenseProps {
  userId?: string
}

async function getUserTags(userId?: string) {
  if (!userId) {
    return { userLikes: [], userBookmarks: [], userReadingProgress: {} }
  }
  
  const supabase = await createClient()
  
  // ユーザーの行動データを並行取得
  const [likesResult, bookmarksResult, progressResult] = await Promise.all([
    supabase.from('likes').select('work_id').eq('user_id', userId),
    supabase.from('bookmarks').select('work_id').eq('user_id', userId),
    supabase.from('reading_progress').select('work_id, progress').eq('user_id', userId)
  ])
  
  return {
    userLikes: likesResult.data?.map(l => l.work_id) || [],
    userBookmarks: bookmarksResult.data?.map(b => b.work_id) || [],
    userReadingProgress: progressResult.data?.reduce((acc, p) => {
      acc[p.work_id] = p.progress
      return acc
    }, {} as Record<string, number>) || {}
  }
}

async function UserTagsData({ userId }: UserTagsSuspenseProps) {
  const { userLikes, userBookmarks, userReadingProgress } = await getUserTags(userId)
  const { isWarm, tagGroups } = await getCachedUserTagsRecommendations(userId, 'views_all', 9)
  
  if (tagGroups.length === 0) {
    return null
  }
  
  return (
    <UserTagsSection
      tagGroups={tagGroups}
      isWarm={isWarm}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      userReadingProgress={userReadingProgress}
    />
  )
}

export function UserTagsSuspense({ userId }: UserTagsSuspenseProps) {
  return (
    <Suspense fallback={<LoadingSpinner text="おすすめタグを読み込み中..." />}>
      <UserTagsData userId={userId} />
    </Suspense>
  )
}