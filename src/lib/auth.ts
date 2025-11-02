import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'
import { cache } from 'react'

// ユーザの認証処理(ログイン状態の確認)
export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  // 時間計測開始
  const startTime = Date.now()
  console.log('getAuthenticatedUser: Starting auth check...')

  // supabaseオブジェクトの作成(createClientではCookie情報もくっついてるはず)
  const supabase = await createClient()
  
  try {
    // supabaseオブジェクトからユーザオブジェクトを取得(エラーの場合は認証エラーとなる)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // 未ログインユーザの場合
      if (error.message.includes('Auth session missing')) {
        console.log('No auth session found - user not logged in')
        return null
      }
      
      console.error('Auth user error:', error)
      
      // セッショントークンが無効or期限切れ
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        console.log('Clearing invalid session')
        try {
          // トークンが切れているので明示的にサインアウト
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
        }
      }
      
      // システム上では正常系なのでuserがnullとして返す
      return null
    }
    
    // 以降、時間計測用の処理
    console.log('getAuthenticatedUser: User result:', user ? { user: user.id, email: user.email } : 'No user')
    const totalTime = Date.now() - startTime
    console.log(`[AUTH] getAuthenticatedUser総処理時間: ${totalTime}ms`)
    return user
  } catch (error) {
    console.error('Auth user exception:', error)
    const totalTime = Date.now() - startTime
    console.log(`[AUTH] getAuthenticatedUser総処理時間(エラー): ${totalTime}ms`)
    return null
  }
})



// postページ用の軽量プロフィール取得関数
export const getPostUserProfile = cache(async () => {
  const startTime = Date.now()
  console.log('[POST AUTH] プロフィール取得開始')
  
  // supabaseオブジェクトの作成(createClientではCookie情報もくっついてるはず)
  const supabase = await createClient()
  
  try {
    // supabaseオブジェクトからユーザオブジェクトを取得(エラーの場合は認証エラーとなる)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[POST AUTH] ユーザー認証失敗')
      return null
    }
    
    // プロフィール情報を取得
    const profileStartTime = Date.now()

    // usersテーブルからユーザ情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('username, avatar_img_url')
      .eq('id', user.id)
      .single()

    const profileEndTime = Date.now()
    console.log(`[POST AUTH] プロフィール取得時間: ${profileEndTime - profileStartTime}ms`)
    
    if (profileError) {
      console.error(`[POST AUTH] プロフィール取得エラー:`, profileError)
    }
    
    const totalTime = Date.now() - startTime
    console.log(`[POST AUTH] 総処理時間: ${totalTime}ms`)
    
    return {
      ...user,
      username: profile?.username,
      avatar_url: profile?.avatar_img_url
    }
  } catch (error) {
    console.error('[POST AUTH] プロフィール取得例外:', error)
    const totalTime = Date.now() - startTime
    console.log(`[POST AUTH] 総処理時間(エラー): ${totalTime}ms`)
    return null
  }
})

// 後方互換性のため残しておく（非推奨）
export const getAuthenticatedUserWithProfile = getPostUserProfile