import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ImpressionContext } from '@/lib/hooks/useImpressionTracking'

interface ImpressionData {
  workId: string
  context: ImpressionContext
  sessionId: string
  intersectionRatio: number
  displayDuration: number
  viewportDimensions: {
    width: number
    height: number
  }
  userAgent: string
}

interface RequestBody {
  impressions: ImpressionData[]
}

// ボット検出のための簡易フィルター
function isLikelyBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /lighthouse/i,
    /pagespeed/i,
  ]
  
  return botPatterns.some(pattern => pattern.test(userAgent))
}

// 異常値検出
function isAnomalousImpression(impression: ImpressionData): boolean {
  // 表示時間が異常に短い（500ms未満）
  if (impression.displayDuration < 500) return true
  
  // 表示割合が異常に低い（30%未満）
  if (impression.intersectionRatio < 0.3) return true
  
  // ビューポートサイズが異常
  const { width, height } = impression.viewportDimensions
  if (width < 100 || height < 100 || width > 10000 || height > 10000) return true
  
  return false
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    
    if (!body.impressions || !Array.isArray(body.impressions)) {
      return NextResponse.json({ error: 'Invalid impressions data' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const validImpressions = body.impressions.filter(impression => {
      // ボット検出
      if (isLikelyBot(impression.userAgent)) {
        console.log('Bot detected, skipping impression:', impression.userAgent)
        return false
      }
      
      // 異常値検出
      if (isAnomalousImpression(impression)) {
        console.log('Anomalous impression detected, skipping:', impression)
        return false
      }
      
      // 必須フィールドチェック
      if (!impression.workId || !impression.sessionId) {
        return false
      }
      
      return true
    })

    if (validImpressions.length === 0) {
      return NextResponse.json({ success: true, recorded: 0 })
    }

    // バッチインサート用のデータを準備
    const insertData = validImpressions.map(impression => ({
      user_id: user?.id || null,
      work_id: impression.workId,
      impression_type: impression.context.impressionType,
      page_context: impression.context.pageContext,
      position: impression.context.position || null,
      session_id: impression.sessionId,
      user_agent: impression.userAgent,
      viewport_width: impression.viewportDimensions.width,
      viewport_height: impression.viewportDimensions.height,
      intersection_ratio: Math.round(impression.intersectionRatio * 100) / 100, // 小数点2桁に丸める
      display_duration: impression.displayDuration,
    }))

    // バッチインサート実行
    const { error } = await supabase
      .from('impressions_log')
      .insert(insertData)

    if (error) {
      // セッション内重複エラーは無視（23505 = unique_violation）
      if (error.code === '23505') {
        console.log('Duplicate impression ignored:', error.message)
        return NextResponse.json({ success: true, recorded: 0 })
      }
      
      console.error('Impression記録エラー:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`✅ Impression記録完了: ${validImpressions.length} 件`)
    
    return NextResponse.json({ 
      success: true, 
      recorded: validImpressions.length,
      filtered: body.impressions.length - validImpressions.length
    })

  } catch (error) {
    console.error('Impression API エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}