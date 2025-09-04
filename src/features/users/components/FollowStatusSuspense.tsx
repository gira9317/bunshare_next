import { isFollowing, isFollowPending } from '../server/loader'

interface FollowStatusSuspenseProps {
  currentUserId: string
  targetUserId: string
  children: (followingStatus: boolean, pendingStatus: boolean) => React.ReactNode
}

export async function FollowStatusSuspense({ 
  currentUserId, 
  targetUserId, 
  children 
}: FollowStatusSuspenseProps) {
  if (currentUserId === targetUserId) {
    return children(false, false)
  }

  const [followingStatus, pendingStatus] = await Promise.all([
    isFollowing(currentUserId, targetUserId),
    isFollowPending(currentUserId, targetUserId)
  ])

  return children(followingStatus, pendingStatus)
}