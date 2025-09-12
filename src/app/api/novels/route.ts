import { NextRequest, NextResponse } from 'next/server'
import { getWorksByCategoriesWithSort } from '@/features/works/server/loader'

// GETリクエスト対応（プリロード用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sortBy') || 'views_all'
    const limit = parseInt(searchParams.get('limit') || '9')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!['views_all', 'views_month', 'views_week', 'views_day', 'created_at'].includes(sortBy)) {
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
    console.error('小説取得エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

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