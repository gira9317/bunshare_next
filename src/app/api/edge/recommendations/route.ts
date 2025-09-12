import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'

// シンプルなインメモリレート制限（プロダクションではRedis推奨）
const rateLimitMap = new Map<string, { count: number, resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1分
const MAX_REQUESTS_PER_WINDOW = 60 // フロントエンド経由は緩め

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

// Edge Functions版推薦API
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request)
  
  // レート制限チェック
  const rateLimit = checkRateLimit(clientIP)
  if (!rateLimit.allowed) {
    return NextResponse.json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
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
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const strategy = searchParams.get('strategy') as 'personalized' | 'adaptive' | 'popular' | null
    
    console.log(`🌐 [Edge API] 推薦リクエスト - userId: ${user?.id || 'guest'}, limit: ${limit}, strategy: ${strategy || 'auto'}`)

    // Supabase Edge Functions URL
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recommendations`
    
    // Edge Functionへのリクエスト
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        userId: user?.id,
        limit,
        offset,
        strategy
      })
    })

    if (!response.ok) {
      console.error(`❌ [Edge API] Edge Function エラー: ${response.status}`)
      const errorText = await response.text()
      console.error(`❌ [Edge API] エラー詳細:`, errorText)
      throw new Error(`Edge Function failed: ${response.status}`)
    }

    const result = await response.json()
    console.log(`✅ [Edge API] 推薦取得成功 - ${result.works?.length || 0}件`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': user?.id ? 'private, max-age=300' : 'public, max-age=600',
        'X-Response-Type': 'edge-recommendations',
        'X-Engine': 'Edge Functions',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-Client-IP': clientIP
      }
    })

  } catch (error) {
    console.error('❌ [Edge API] エラー:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch recommendations from Edge Functions',
      details: error instanceof Error ? error.message : 'Unknown error',
      engine: 'Edge Functions'
    }, { 
      status: 500,
      headers: {
        'X-Engine': 'Edge Functions'
      }
    })
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  
  // レート制限チェック
  const rateLimit = checkRateLimit(clientIP)
  if (!rateLimit.allowed) {
    return NextResponse.json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    }, { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Remaining': '0'
      }
    })
  }

  // POST版では追加パラメータをサポート
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    
    const {
      userId = user?.id,
      limit = 20,
      offset = 0,
      strategy,
      excludeWorkIds = []
    } = body

    console.log(`🌐 [Edge API] POST推薦リクエスト - userId: ${userId || 'guest'}, excludeCount: ${excludeWorkIds.length}`)

    // Edge Functionへのリクエスト
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recommendations`
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        userId,
        limit,
        offset,
        strategy
      })
    })

    if (!response.ok) {
      throw new Error(`Edge Function failed: ${response.status}`)
    }

    const result = await response.json()

    // excludeWorkIds による除外処理をフロントエンド側で実行
    if (excludeWorkIds.length > 0) {
      result.works = result.works.filter((work: any) => !excludeWorkIds.includes(work.work_id))
      result.total = result.works.length
      console.log(`🚫 [Edge API] 除外後: ${result.works.length}件`)
    }

    console.log(`✅ [Edge API] POST推薦取得成功 - ${result.works?.length || 0}件`)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': userId ? 'private, max-age=300' : 'public, max-age=600',
        'X-Response-Type': 'edge-recommendations',
        'X-Engine': 'Edge Functions',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-Client-IP': clientIP
      }
    })

  } catch (error) {
    console.error('❌ [Edge API] POST エラー:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch recommendations from Edge Functions',
      details: error instanceof Error ? error.message : 'Unknown error',
      engine: 'Edge Functions'
    }, { status: 500 })
  }
}