import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { getWorksByTag } from '@/features/home/server/userTagsLoader'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const { tag, sortBy = 'views_all', excludeWorkIds = [], limit = 6 } = await request.json()
    
    if (!tag) {
      return NextResponse.json({ error: 'タグが指定されていません' }, { status: 400 })
    }
    
    console.log(`🏷️ [DEBUG] タグ追加取得 - タグ: ${tag}, 除外: ${excludeWorkIds?.length || 0}件`)
    
    // 指定タグの追加作品を取得
    const works = await getWorksByTag(tag, sortBy, limit, excludeWorkIds)
    
    console.log(`✅ [DEBUG] タグ追加取得完了: ${works.length}件`)
    
    return NextResponse.json({
      works,
      hasMore: works.length === limit // 要求数と同じ数が取得できた場合はまだある可能性
    })
    
  } catch (error) {
    console.error('タグ追加取得エラー:', error)
    return NextResponse.json(
      { error: 'タグ作品の追加取得に失敗しました' },
      { status: 500 }
    )
  }
}