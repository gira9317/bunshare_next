import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params

    // Get liked works with work and author information
    const { data, error } = await supabase
      .from('likes')
      .select(`
        work_id,
        works!likes_work_id_fkey (
          work_id,
          title,
          description,
          image_url,
          author,
          user_id,
          created_at,
          likes_count,
          views_count,
          users!works_user_id_fkey (
            username
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching liked works:', error)
      return NextResponse.json({ error: 'Failed to fetch liked works' }, { status: 500 })
    }

    // Transform the data to match expected format
    const likedWorks = data?.map(like => ({
      work_id: like.works.work_id,
      title: like.works.title,
      description: like.works.description,
      image_url: like.works.image_url,
      author: like.works.author,
      author_username: like.works.users?.username || null,
      created_at: like.works.created_at,
      likes_count: like.works.likes_count || 0,
      views_count: like.works.views_count || 0
    })) || []

    return NextResponse.json(likedWorks)
  } catch (error) {
    console.error('Error in liked-works API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}