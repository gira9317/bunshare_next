import { getUserWorks } from '../server/loader'
import { UserWorksSection } from '../sections/UserWorksSection'

interface UserWorksSuspenseProps {
  userId: string
  limit?: number
}

export async function UserWorksSuspense({ userId, limit = 6 }: UserWorksSuspenseProps) {
  const works = await getUserWorks(userId, limit, 0)
  
  return <UserWorksSection works={works} />
}