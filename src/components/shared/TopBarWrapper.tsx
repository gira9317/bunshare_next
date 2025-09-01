import { getCurrentUserProfile } from '@/features/users_icon/server/loader'
import { getCurrentUserNotifications } from '@/features/notifications/server/loader'
import { TopBar } from './TopBar'

export async function TopBarWrapper() {
  const [userProfile, notificationData] = await Promise.all([
    getCurrentUserProfile(),
    getCurrentUserNotifications()
  ])

  return (
    <TopBar 
      userProfile={userProfile}
      initialNotifications={notificationData.notifications}
      initialUnreadCount={notificationData.unreadCount}
    />
  )
}