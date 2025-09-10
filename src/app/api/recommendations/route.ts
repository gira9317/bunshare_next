import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getRecommendationsAction } from '@/features/home/server/recommendations'

// 認証が必要なためNode.js Runtimeを使用
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const result = await getRecommendationsAction(user?.id)
    
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5分プライベートキャッシュ
        'X-Response-Type': 'recommendations'
      }
    })
  } catch (error) {
    console.error('推薦API エラー:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // 追加の推薦データ取得
  return GET(request)
}