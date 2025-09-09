import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getRecommendationsAction } from '@/features/home/server/recommendations'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const { excludeWorkIds, offset = 0 } = await request.json()
    
    console.log(`🔄 [DEBUG] 追加推薦取得 - offset: ${offset}, 除外: ${excludeWorkIds?.length || 0}件`)
    
    // 追加の推薦を取得（除外リストを考慮）
    const result = await getRecommendationsAction(user?.id, excludeWorkIds, 72)
    
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    // 既に表示した作品を除外
    const filteredWorks = result.works.filter(work => 
      !excludeWorkIds?.includes(work.work_id)
    )
    
    // 次の9件を返す
    const nextBatch = filteredWorks.slice(0, 9)
    
    console.log(`✅ [DEBUG] 追加推薦返却: ${nextBatch.length}件`)
    
    return NextResponse.json({
      works: nextBatch,
      hasMore: filteredWorks.length > 9,
      strategy: result.strategy,
      source: result.source
    })
    
  } catch (error) {
    console.error('追加推薦取得エラー:', error)
    return NextResponse.json(
      { error: '追加推薦の取得に失敗しました' },
      { status: 500 }
    )
  }
}