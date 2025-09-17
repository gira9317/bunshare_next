import { getContinueReadingWorks, getUserLikesAndBookmarks } from '@/features/works/server/loader'
import { ContinueReadingSection } from '../sections/ContinueReadingSection'

interface ContinueReadingSuspenseProps {
  userId: string
}

export async function ContinueReadingSuspense({ userId }: ContinueReadingSuspenseProps) {
  const [continueReadingWorks, { userLikes, userBookmarks }] = await Promise.all([
    getContinueReadingWorks(userId),
    getUserLikesAndBookmarks(userId)
  ])
  
  
  if (continueReadingWorks.length === 0) {
    return null
  }
  
  return <ContinueReadingSection 
    works={continueReadingWorks}
    userLikes={userLikes}
    userBookmarks={userBookmarks}
  />
}