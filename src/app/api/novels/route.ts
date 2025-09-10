import { NextRequest, NextResponse } from 'next/server'
import { getWorksByCategoriesWithSort } from '@/features/works/server/loader'

export async function POST(request: NextRequest) {
  try {
    const { sortBy, limit = 9, offset = 0 } = await request.json()
    
    if (!sortBy || !['views_all', 'views_month', 'views_week', 'views_day', 'created_at'].includes(sortBy)) {
      return NextResponse.json(
        { error: '無効なソート条件です' },
        { status: 400 }
      )
    }
    
    const works = await getWorksByCategoriesWithSort(
      ['小説'], 
      sortBy as 'views_all' | 'views_month' | 'views_week' | 'views_day' | 'created_at',
      limit,
      offset
    )
    
    return NextResponse.json({ works })
  } catch (error) {
    console.error('小説並び替えエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}