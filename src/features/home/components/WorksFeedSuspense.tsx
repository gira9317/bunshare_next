import { getWorks, getUserLikesAndBookmarks, getUserReadingProgress } from '@/features/works/server/loader'
import { WorksFeedSection } from '../sections/WorksFeedSection'

interface WorksFeedSuspenseProps {
  userId?: string
  limit?: number
  offset?: number
}

export async function WorksFeedSuspense({ userId, limit = 6, offset = 0 }: WorksFeedSuspenseProps) {
  const works = await getWorks(limit, offset)
  
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
    <WorksFeedSection 
      works={works}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
      userReadingProgress={userReadingProgress}
    />
  )
}