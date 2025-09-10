import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getCachedUserTagsRecommendations } from '@/features/home/server/userTagsLoader'
import { z } from 'zod'

const userTagsSchema = z.object({
  sortBy: z.enum(['views_all', 'views_month', 'views_week', 'views_day', 'created_at']).default('views_all'),
  limit: z.number().min(1).max(20).default(9),
  offset: z.number().min(0).default(0)
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    const { sortBy, limit, offset } = userTagsSchema.parse(body)
    
    // オフセットがある場合は追加データを取得
    const actualLimit = offset > 0 ? limit + offset : limit
    
    const { isWarm, tagGroups } = await getCachedUserTagsRecommendations(
      user?.id,
      sortBy,
      actualLimit
    )
    
    // オフセット分をスキップ
    const offsetTagGroups = offset > 0 ? tagGroups.slice(offset) : tagGroups
    
    return NextResponse.json({
      tagGroups: offsetTagGroups,
      isWarm,
      hasMore: tagGroups.length >= actualLimit
    })
  } catch (error) {
    console.error('ユーザータグAPI エラー:', error)
    return NextResponse.json(
      { error: 'タグデータの取得に失敗しました' },
      { status: 500 }
    )
  }
}