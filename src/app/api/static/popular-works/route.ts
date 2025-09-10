import { NextResponse } from 'next/server'
import { getPublicClient } from '@/lib/supabase/pool'

// Edge Runtimeで高速化 + ISRで静的生成（10分間キャッシュ）
export const runtime = 'edge'
export const revalidate = 600

export async function GET() {
  try {
    const supabase = getPublicClient()
    
    // 人気作品を静的に生成
    const { data: works, error } = await supabase
      .from('works')
      .select(`
        work_id,
        title,
        description,
        image_url,
        category,
        tags,
        created_at,
        user_id,
        series_id,
        episode_number,
        views_count,
        likes_count,
        comments_count,
        trend_score
      `)
      .eq('is_published', true)
      .order('trend_score', { ascending: false })
      .order('likes_count', { ascending: false })
      .order('views_count', { ascending: false })
      .limit(50) // 大きめに取得してクライアント側で調整

    if (error) {
      console.error('静的人気作品取得エラー:', error)
      return NextResponse.json({ error: 'Failed to fetch popular works' }, { status: 500 })
    }

    // ユーザー情報を別途取得
    const userIds = [...new Set(works?.map(work => work.user_id).filter(Boolean))]
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds)

    const userMap = users?.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as { [key: string]: any }) || {}

    const enrichedWorks = works?.map(work => ({
      ...work,
      author: userMap[work.user_id]?.username || '不明',
      author_username: userMap[work.user_id]?.username,
      views: work.views_count || 0,
      likes: work.likes_count || 0,
      comments: work.comments_count || 0
    })) || []

    return NextResponse.json({
      works: enrichedWorks,
      generated_at: new Date().toISOString(),
      cache: 'static-isr'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
        'X-Static-Generation': 'true'
      }
    })

  } catch (error) {
    console.error('静的人気作品生成エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}