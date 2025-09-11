import { NextRequest, NextResponse } from 'next/server'
import { getRecommendationComparison, getRecommendationStats } from '@/features/home/server/postgres-recommendations'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const limit = parseInt(searchParams.get('limit') || '10')
  const action = searchParams.get('action') || 'compare'
  
  // 簡易認証（本番では適切な認証を実装）
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    if (action === 'stats') {
      // 推薦統計を取得
      const stats = await getRecommendationStats()
      return NextResponse.json({
        success: true,
        stats
      })
    }
    
    if (action === 'compare') {
      // A/Bテスト比較
      const comparison = await getRecommendationComparison(userId || undefined, limit)
      
      return NextResponse.json({
        success: true,
        comparison,
        metadata: {
          userId: userId || 'guest',
          limit,
          timestamp: new Date().toISOString()
        }
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('推薦テストエラー:', error)
    return NextResponse.json({
      error: 'システムエラー',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const { action } = await request.json()
    
    if (action === 'refresh-cache') {
      const { refreshRecommendationCache } = await import('@/features/home/server/postgres-recommendations')
      const result = await refreshRecommendationCache()
      
      return NextResponse.json(result)
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('推薦操作エラー:', error)
    return NextResponse.json({
      error: 'システムエラー',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}