import { NextRequest, NextResponse } from 'next/server'
import { getRecommendationComparison } from '@/features/home/server/postgres-recommendations'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック（オプション）
    let userId: string | undefined
    try {
      const user = await getAuthenticatedUser()
      userId = user?.id
    } catch {
      // 認証失敗時はゲストとして扱う
      userId = undefined
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log(`🔍 A/Bテスト比較開始 - userId: ${userId || 'guest'}, limit: ${limit}`)
    
    // 強制リフレッシュの場合はキャッシュを無効化
    const headers: HeadersInit = {}
    if (forceRefresh) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    }
    
    const startTime = Date.now()
    
    // PostgreSQL vs Node.js の推薦を比較
    const comparison = await getRecommendationComparison(userId, limit)
    
    const totalTime = Date.now() - startTime
    
    // 比較結果の分析
    const analysis = {
      performance: {
        postgresql_faster: comparison.comparison.postgresql_time < comparison.comparison.nodejs_time,
        time_difference: Math.abs(
          parseInt(comparison.comparison.postgresql_time) - 
          parseInt(comparison.comparison.nodejs_time)
        ),
        postgresql_time: comparison.comparison.postgresql_time,
        nodejs_time: comparison.comparison.nodejs_time
      },
      recommendations: {
        overlap_count: comparison.comparison.overlap_count,
        overlap_percentage: 'works' in comparison.postgresql && 'works' in comparison.nodejs 
          ? Math.round((comparison.comparison.overlap_count / Math.max(comparison.postgresql.works.length, comparison.nodejs.works.length)) * 100)
          : 0,
        postgresql_count: 'works' in comparison.postgresql ? comparison.postgresql.works.length : 0,
        nodejs_count: 'works' in comparison.nodejs ? comparison.nodejs.works.length : 0
      },
      quality: {
        postgresql_success: !('error' in comparison.postgresql),
        nodejs_success: !('error' in comparison.nodejs),
        postgresql_strategy: 'strategy' in comparison.postgresql ? comparison.postgresql.strategy : null,
        nodejs_strategy: 'strategy' in comparison.nodejs ? comparison.nodejs.strategy : null
      }
    }
    
    console.log(`✅ A/Bテスト比較完了 (${totalTime}ms)`)
    console.log(`📊 パフォーマンス: PostgreSQL ${comparison.comparison.postgresql_time} vs Node.js ${comparison.comparison.nodejs_time}`)
    console.log(`🔗 重複率: ${analysis.recommendations.overlap_percentage}% (${comparison.comparison.overlap_count}/${Math.max(analysis.recommendations.postgresql_count, analysis.recommendations.nodejs_count)})`)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user_id: userId || null,
      limit,
      total_time: `${totalTime}ms`,
      comparison: comparison.comparison,
      analysis,
      results: {
        postgresql: comparison.postgresql,
        nodejs: comparison.nodejs
      }
    }, { headers })
    
  } catch (error) {
    console.error('❌ A/Bテスト比較エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'A/Bテスト比較に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, limit = 10, action } = body
    
    if (action === 'refresh-cache') {
      // 推薦キャッシュの手動更新
      const { refreshRecommendationCache } = await import('@/features/home/server/postgres-recommendations')
      const result = await refreshRecommendationCache()
      
      return NextResponse.json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString()
      })
    }
    
    // 通常の比較テスト実行
    const comparison = await getRecommendationComparison(userId, limit)
    
    return NextResponse.json({
      success: true,
      comparison: comparison.comparison,
      results: {
        postgresql: comparison.postgresql,
        nodejs: comparison.nodejs
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ A/BテストPOSTエラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'A/Bテスト実行に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}