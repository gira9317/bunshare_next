import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { userId } = await params

    // Get following with user information
    const { data, error } = await supabase
      .from('follows')
      .select(`
        followed_id,
        users!follows_followed_id_fkey (
          id,
          username,
          custom_user_id,
          avatar_img_url,
          bio
        )
      `)
      .eq('follower_id', userId)
      .eq('status', 'approved')

    if (error) {
      console.error('Error fetching following:', error)
      return NextResponse.json({ error: 'Failed to fetch following' }, { status: 500 })
    }

    // Transform the data to match expected format
    const following = data?.map(follow => ({
      id: follow.users.id,
      username: follow.users.username,
      custom_user_id: follow.users.custom_user_id,
      avatar_img_url: follow.users.avatar_img_url,
      bio: follow.users.bio
    })) || []

    return NextResponse.json(following)
  } catch (error) {
    console.error('Error in following API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}