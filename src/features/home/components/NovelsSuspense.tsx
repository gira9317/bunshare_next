import { getWorksByCategoriesWithSort, getUserLikesAndBookmarks, getUserReadingProgress } from '@/features/works/server/loader'
import { NovelsSection } from '../sections/NovelsSection'

interface NovelsSuspenseProps {
  userId?: string
  sortBy?: 'views' | 'likes' | 'comments' | 'created_at'
  limit?: number
}

export async function NovelsSuspense({ 
  userId, 
  sortBy = 'views',
  limit = 9 
}: NovelsSuspenseProps) {
  const works = await getWorksByCategoriesWithSort(['小説'], sortBy, limit)
  
  let userLikes: string[] = []
  let userBookmarks: string[] = []
  let userReadingProgress: Record<string, number> = {}
  
  if (userId && works.length > 0) {
    try {
      const workIds = works.map(w => w.work_id)
      const [{ likedWorkIds, bookmarkedWorkIds }, progressData] = await Promise.all([
        getUserLikesAndBookmarks(userId, workIds),
        getUserReadingProgress(userId)
      ])
      userLikes = likedWorkIds
      userBookmarks = bookmarkedWorkIds
      userReadingProgress = progressData
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }
  
  return (
    <NovelsSection 
      works={works}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      userReadingProgress={userReadingProgress}
    />
  )
}