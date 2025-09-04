import { UserProfileSection } from '../sections/UserProfileSection'
import type { UserProfile } from '../types'

interface ProfileSuspenseProps {
  user: UserProfile
  currentUserId?: string
  isFollowing?: boolean
  isPending?: boolean
}

export function ProfileSuspense({ 
  user, 
  currentUserId, 
  isFollowing = false, 
  isPending = false 
}: ProfileSuspenseProps) {
  return (
    <UserProfileSection
      user={user}
      currentUserId={currentUserId}
      isFollowing={isFollowing}
      isPending={isPending}
    />
  )
}