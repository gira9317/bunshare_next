import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getPostgreSQLRecommendations } from '@/features/home/server/postgres-recommendations'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    console.log(`🔄 [DEBUG] PostgreSQL推薦取得 - limit: ${limit}, offset: ${offset}`)
    
    const result = await getPostgreSQLRecommendations(user?.id, limit, offset)
    
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    console.log(`✅ [DEBUG] PostgreSQL推薦返却: ${result.works.length}件`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('PostgreSQL推薦取得エラー:', error)
    return NextResponse.json(
      { error: 'PostgreSQL推薦の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const { excludeWorkIds, offset = 0 } = await request.json()
    
    console.log(`🔄 [DEBUG] PostgreSQL追加推薦取得 - offset: ${offset}, 除外: ${excludeWorkIds?.length || 0}件`)
    
    // 追加の推薦を取得（除外リストを考慮）
    const result = await getPostgreSQLRecommendations(user?.id, 36, offset)
    
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    // 既に表示した作品を除外
    const filteredWorks = result.works.filter(work => 
      !excludeWorkIds?.includes(work.work_id)
    )
    
    // 次の9件を返す
    const nextBatch = filteredWorks.slice(0, 9)
    
    console.log(`✅ [DEBUG] PostgreSQL追加推薦返却: ${nextBatch.length}件`)
    
    return NextResponse.json({
      works: nextBatch,
      hasMore: filteredWorks.length > 9,
      strategy: result.strategy,
      source: result.source,
      engine: result.engine,
      queryTime: result.queryTime
    })
    
  } catch (error) {
    console.error('PostgreSQL追加推薦取得エラー:', error)
    return NextResponse.json(
      { error: 'PostgreSQL追加推薦の取得に失敗しました' },
      { status: 500 }
    )
  }
}