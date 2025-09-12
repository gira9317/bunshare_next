import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'

// レート制限（more要求は頻繁なので制限を緩める）
const rateLimitMap = new Map<string, { count: number, resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1分
const MAX_REQUESTS_PER_WINDOW = 40 // more用に少し多め

function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  return xff?.split(',')[0]?.trim() || realIP || 'unknown'
}

function checkRateLimit(identifier: string): { allowed: boolean, remaining: number } {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 }
  }
  
  userLimit.count++
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - userLimit.count }
}

// Edge Functions版「さらに表示」API
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  
  // レート制限チェック
  const rateLimit = checkRateLimit(clientIP)
  if (!rateLimit.allowed) {
    return NextResponse.json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded for more requests. Please try again later.'
    }, { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Remaining': '0'
      }
    })
  }

  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    
    const {
      excludeWorkIds = [],
      limit = 9,
      strategy
    } = body

    console.log(`🔄 [Edge More] さらに表示リクエスト - userId: ${user?.id || 'guest'}, excludeCount: ${excludeWorkIds.length}`)

    // 除外対象を考慮してより多めに取得
    const fetchLimit = limit + excludeWorkIds.length + 10 // 余裕をもって取得

    // Edge Functionへのリクエスト
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recommendations`
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        userId: user?.id,
        limit: fetchLimit,
        offset: excludeWorkIds.length, // 除外される作品数をオフセットに利用
        strategy
      })
    })

    if (!response.ok) {
      console.error(`❌ [Edge More] Edge Function エラー: ${response.status}`)
      const errorText = await response.text()
      console.error(`❌ [Edge More] エラー詳細:`, errorText)
      throw new Error(`Edge Function failed: ${response.status}`)
    }

    const result = await response.json()

    // 除外処理
    if (excludeWorkIds.length > 0) {
      result.works = result.works.filter((work: any) => !excludeWorkIds.includes(work.work_id))
      console.log(`🚫 [Edge More] 除外後: ${result.works.length}件`)
    }

    // 必要数までに制限
    const finalWorks = result.works.slice(0, limit)
    result.works = finalWorks
    result.total = finalWorks.length

    console.log(`✅ [Edge More] さらに表示完了 - ${finalWorks.length}件`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': user?.id ? 'private, max-age=180' : 'public, max-age=300', // 短めのキャッシュ
        'X-Response-Type': 'edge-recommendations-more',
        'X-Engine': 'Edge Functions',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-Client-IP': clientIP
      }
    })

  } catch (error) {
    console.error('❌ [Edge More] エラー:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch more recommendations from Edge Functions',
      details: error instanceof Error ? error.message : 'Unknown error',
      engine: 'Edge Functions'
    }, { status: 500 })
  }
}