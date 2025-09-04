import { NextRequest, NextResponse } from 'next/server'
import { getWorks, getUserLikesAndBookmarks } from '@/features/works/server/loader'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '6')
  const offset = parseInt(searchParams.get('offset') || '0')
  const userId = searchParams.get('userId')

  try {
    // 作品一覧を取得
    const works = await getWorks(limit, offset)
    
    let userLikes: string[] = []
    let userBookmarks: string[] = []
    
    // ユーザーがログインしている場合、いいね・ブックマーク状態を取得
    if (userId && works.length > 0) {
      try {
        const workIds = works.map(w => w.work_id)
        const { likedWorkIds, bookmarkedWorkIds } = await getUserLikesAndBookmarks(userId, workIds)
        userLikes = likedWorkIds
        userBookmarks = bookmarkedWorkIds
      } catch (error) {
        console.error('Error loading user likes/bookmarks:', error)
      }
    }

    return NextResponse.json({
      works,
      userLikes,
      userBookmarks
    })
  } catch (error) {
    console.error('API works route error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch works' },
      { status: 500 }
    )
  }
}