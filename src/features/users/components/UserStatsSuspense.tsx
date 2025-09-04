import { getUserStats } from '../server/loader'
import { UserStatsSection } from '../sections/UserStatsSection'

interface UserStatsSuspenseProps {
  userId: string
}

export async function UserStatsSuspense({ userId }: UserStatsSuspenseProps) {
  const stats = await getUserStats(userId)
  
  return <UserStatsSection stats={stats} />
}