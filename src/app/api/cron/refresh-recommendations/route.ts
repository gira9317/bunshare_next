import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 簡易認証（本番では適切な認証を実装）
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const startTime = Date.now()
    
    console.log('🔄 [手動実行] 推薦キャッシュ更新開始...')
    
    // Supabase内のPostgreSQL関数を手動実行
    const { data, error } = await supabase.rpc('manual_refresh_recommendations')
    
    if (error) {
      console.error('❌ 推薦キャッシュ手動更新エラー:', error)
      return NextResponse.json({ 
        error: '推薦キャッシュの手動更新に失敗しました',
        details: error.message 
      }, { status: 500 })
    }
    
    const duration = Date.now() - startTime
    
    console.log(`✅ 推薦キャッシュ手動更新完了 (${duration}ms)`)
    console.log('📊 更新結果:', data)
    
    return NextResponse.json({
      success: true,
      message: '推薦キャッシュが手動で正常に更新されました',
      api_duration: `${duration}ms`,
      supabase_result: data,
      timestamp: new Date().toISOString(),
      note: 'このAPIは手動実行用です。自動更新はSupabase Cronで実行されています。'
    })
    
  } catch (error) {
    console.error('❌ 推薦キャッシュ手動更新例外:', error)
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