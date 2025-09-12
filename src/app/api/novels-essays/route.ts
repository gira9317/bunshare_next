import { NextRequest, NextResponse } from 'next/server'
import { getWorksByCategoriesWithSort } from '@/features/works/server/loader'

export async function POST(request: NextRequest) {
  try {
    const { sortBy, limit = 12, offset = 0 } = await request.json()
    
    if (!sortBy || !['views', 'likes', 'comments', 'created_at'].includes(sortBy)) {
      return NextResponse.json(
        { error: '無効なソート条件です' },
        { status: 400 }
      )
    }
    
    const works = await getWorksByCategoriesWithSort(
      ['小説', '詩', 'エッセイ', '日記', 'ラノベ', 'ノンフィクション'], 
      sortBy as 'views' | 'likes' | 'comments' | 'created_at',
      limit,
      offset
    )
    
    return NextResponse.json({ works })
  } catch (error) {
    console.error('小説・エッセイ並び替えエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}