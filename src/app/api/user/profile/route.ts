import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getUserProfileByUser } from '@/features/users_icon/server/loader'
import { getNotificationsByUser } from '@/features/notifications/server/loader'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return NextResponse.json({
        userProfile: null,
        notifications: [],
        unreadCount: 0
      })
    }

    const [userProfile, notificationData] = await Promise.all([
      getUserProfileByUser(user),
      getNotificationsByUser(user)
    ])

    return NextResponse.json({
      userProfile,
      notifications: notificationData.notifications,
      unreadCount: notificationData.unreadCount
    })
  } catch (error) {
    console.error('User profile API error:', error)
    return NextResponse.json(
      { error: 'Failed to load user profile' }, 
      { status: 500 }
    )
  }
}