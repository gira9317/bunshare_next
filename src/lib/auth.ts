import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'
import { cache } from 'react'

export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  const startTime = Date.now()
  console.log('getAuthenticatedUser: Starting auth check...')
  const supabase = await createClient()
  
  try {
    // Use getUser for proper authentication validation
    console.log('getAuthenticatedUser: Calling getUser...')
    const authStartTime = Date.now()
    const { data: { user }, error } = await supabase.auth.getUser()
    const authEndTime = Date.now()
    console.log(`[AUTH] Supabase getUser実行時間: ${authEndTime - authStartTime}ms`)
    
    if (error) {
      // Handle AuthSessionMissingError as a normal case (user not logged in)
      if (error.message.includes('Auth session missing')) {
        console.log('No auth session found - user not logged in')
        return null
      }
      
      console.error('Auth user error:', error)
      
      // If token is invalid, clear session
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        console.log('Clearing invalid session')
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
        }
      }
      
      return null
    }
    
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
  
  const supabase = await createClient()
  
  try {
    const authStartTime = Date.now()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const authEndTime = Date.now()
    console.log(`[POST AUTH] Supabase getUser実行時間: ${authEndTime - authStartTime}ms`)
    
    if (authError || !user) {
      console.log('[POST AUTH] ユーザー認証失敗')
      return null
    }
    
    // プロフィール情報を取得
    const profileStartTime = Date.now()
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