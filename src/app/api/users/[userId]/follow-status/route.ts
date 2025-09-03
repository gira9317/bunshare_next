import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const currentUserId = searchParams.get('currentUserId')
    const { userId } = await params

    if (!currentUserId) {
      return NextResponse.json({ isFollowing: false, isPending: false })
    }

    const supabase = await createClient()

    // Check follow status
    const { data: followData } = await supabase
      .from('follows')
      .select('status')
      .eq('follower_id', currentUserId)
      .eq('followed_id', userId)
      .single()

    const isFollowing = followData?.status === 'approved'
    const isPending = followData?.status === 'pending'

    return NextResponse.json({
      isFollowing,
      isPending
    })

  } catch (error) {
    console.error('Failed to get follow status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}