import { getWorksByCategoriesWithSort, getUserLikesAndBookmarks, getUserReadingProgress } from '@/features/works/server/loader'
import { EssaysSection } from '../sections/EssaysSection'

interface EssaysSuspenseProps {
  userId?: string
  sortBy?: 'views' | 'likes' | 'comments' | 'created_at'
  limit?: number
}

export async function EssaysSuspense({ 
  userId, 
  sortBy = 'views',
  limit = 9 
}: EssaysSuspenseProps) {
  const works = await getWorksByCategoriesWithSort(['エッセイ'], sortBy, limit)
  
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
    <EssaysSection 
      works={works}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      userReadingProgress={userReadingProgress}
    />
  )
}