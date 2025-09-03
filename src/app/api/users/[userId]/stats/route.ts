import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params

    // Get works count
    const { count: worksCount } = await supabase
      .from('works')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_published', true)

    // Get followers count
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('status', 'approved')

    // Get following count
    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)
      .eq('status', 'approved')

    return NextResponse.json({
      works_count: worksCount || 0,
      followers_count: followersCount || 0,
      following_count: followingCount || 0
    })

  } catch (error) {
    console.error('Failed to get user stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}