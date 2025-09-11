import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Vercel Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const startTime = Date.now()
    
    console.log('🔄 推薦キャッシュ更新開始...')
    
    // PostgreSQL関数を実行してマテリアライズドビューを更新
    const { data, error } = await supabase.rpc('refresh_recommendation_cache')
    
    if (error) {
      console.error('❌ 推薦キャッシュ更新エラー:', error)
      return NextResponse.json({ 
        error: '推薦キャッシュの更新に失敗しました',
        details: error.message 
      }, { status: 500 })
    }
    
    // 統計情報を取得
    const { data: stats } = await supabase.rpc('get_recommendation_stats')
    
    const duration = Date.now() - startTime
    
    console.log(`✅ 推薦キャッシュ更新完了 (${duration}ms)`)
    console.log('📊 更新統計:', stats)
    
    return NextResponse.json({
      success: true,
      message: '推薦キャッシュが正常に更新されました',
      duration: `${duration}ms`,
      stats: stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ 推薦キャッシュ更新例外:', error)
    return NextResponse.json({ 
      error: 'システムエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POSTでも同じ処理を実行（手動実行用）
export async function POST(request: NextRequest) {
  return GET(request)
}