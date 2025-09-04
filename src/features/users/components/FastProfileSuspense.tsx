'use client'

import { UserProfileSection } from '../sections/UserProfileSection'
import type { UserProfile } from '../types'

interface FastProfileSuspenseProps {
  user: UserProfile
  currentUserId?: string
}

export function FastProfileSuspense({ 
  user, 
  currentUserId
}: FastProfileSuspenseProps) {
  return (
    <UserProfileSection
      user={user}
      currentUserId={currentUserId}
      isFollowing={false}
      isPending={false}
    />
  )
}