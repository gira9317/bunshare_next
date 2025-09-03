import { getUserProfileByUser } from '@/features/users_icon/server/loader'
import { getNotificationsByUser } from '@/features/notifications/server/loader'
import { TopBar } from './TopBar'
import { getAuthenticatedUser } from '@/lib/auth'

export async function TopBarWrapper() {
  try {
    console.log('TopBarWrapper: Getting authenticated user...')
    const user = await getAuthenticatedUser()
    
    console.log('TopBarWrapper: User result:', user ? { id: user.id, email: user.email } : 'No user')

    if (!user) {
      console.log('TopBarWrapper: No user found, showing default TopBar')
      return (
        <TopBar 
          userProfile={null}
          initialNotifications={[]}
          initialUnreadCount={0}
        />
      )
    }

    console.log('TopBarWrapper: Loading user profile and notifications...')
    const [userProfile, notificationData] = await Promise.all([
      getUserProfileByUser(user),
      getNotificationsByUser(user)
    ])
    
    console.log('TopBarWrapper: User profile loaded:', userProfile ? { id: userProfile.id, username: userProfile.username } : 'No profile')
    console.log('TopBarWrapper: Notifications loaded:', notificationData.notifications.length, 'notifications')

    return (
      <TopBar 
        userProfile={userProfile}
        initialNotifications={notificationData.notifications}
        initialUnreadCount={notificationData.unreadCount}
      />
    )
  } catch (error) {
    console.error('TopBarWrapper error:', error)
    return (
      <TopBar 
        userProfile={null}
        initialNotifications={[]}
        initialUnreadCount={0}
      />
    )
  }
}