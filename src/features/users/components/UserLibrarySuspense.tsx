import { getUserWorks, getUserProfile } from '../server/loader'
import { UserLibrarySection } from '../sections/UserLibrarySection'
import { getAuthenticatedUser } from '@/lib/auth'

interface UserLibrarySuspenseProps {
  userId: string
  limit?: number
}

export async function UserLibrarySuspense({ userId, limit = 6 }: UserLibrarySuspenseProps) {
  const currentUser = await getAuthenticatedUser()
  const isOwnProfile = currentUser?.id === userId
  
  // 基本的な作品データを取得
  const works = await getUserWorks(userId, limit, 0)
  const user = await getUserProfile(userId)
  
  // 自分のプロフィールの場合のみ追加データを取得
  // TODO: これらのデータローダーを後で実装
  const likedWorks = isOwnProfile ? [] : []
  const bookmarks = isOwnProfile ? [] : []
  const viewHistory = isOwnProfile ? [] : []
  const drafts = isOwnProfile ? [] : []
  
  return (
    <UserLibrarySection 
      works={works}
      likedWorks={likedWorks}
      bookmarks={bookmarks}
      viewHistory={viewHistory}
      drafts={drafts}
      user={user}
      isOwnProfile={isOwnProfile}
    />
  )
}