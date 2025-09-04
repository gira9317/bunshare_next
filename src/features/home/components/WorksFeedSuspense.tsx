import { getWorks, getUserLikesAndBookmarks } from '@/features/works/server/loader'
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
  
  if (userId && works.length > 0) {
    try {
      const workIds = works.map(w => w.work_id)
      const { likedWorkIds, bookmarkedWorkIds } = await getUserLikesAndBookmarks(userId, workIds)
      userLikes = likedWorkIds
      userBookmarks = bookmarkedWorkIds
    } catch (error) {
      console.error('Error loading user likes/bookmarks:', error)
    }
  }
  
  return (
    <WorksFeedSection 
      works={works}
      userLikes={userLikes}
      userBookmarks={userBookmarks}
    />
  )
}