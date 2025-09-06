import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  const supabase = await createClient()

  // Handle token_hash-based confirmation (email change)
  if (token_hash && type) {
    try {
      console.log('Processing token_hash confirmation:', type, token_hash)
      
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any
      })
      
      if (!error) {
        console.log('Token confirmation successful')
        
        // Handle specific confirmation types
        if (type === 'email_change') {
          try {
            // Get the updated user info from auth
            const { data: updatedUser } = await supabase.auth.getUser()
            
            if (updatedUser?.user?.email) {
              console.log('Updating users table with new email:', updatedUser.user.email)
              
              // Update the email in users table
              const { error: updateError } = await supabase
                .from('users')
                .update({ 
                  email: updatedUser.user.email 
                })
                .eq('id', updatedUser.user.id)

              if (updateError) {
                console.error('Failed to update users table email:', updateError)
                // Still redirect to success but log the error
              } else {
                console.log('Successfully updated users table email')
                // Clear user cache
                revalidatePath('/', 'layout')
                revalidatePath('/profile')
              }
            }
          } catch (updateError) {
            console.error('Exception updating users table email:', updateError)
          }
          
          return NextResponse.redirect(`${origin}/profile?success=email_changed`)
        }
        
        if (type === 'recovery') {
          console.log('Password recovery confirmed, redirecting to reset password')
          return NextResponse.redirect(`${origin}/auth/reset-password`)
        }
        
        return NextResponse.redirect(`${origin}/profile?success=confirmed`)
      } else {
        console.error('Token confirmation error:', error)
        return NextResponse.redirect(`${origin}/profile?error=confirmation_failed`)
      }
    } catch (error) {
      console.error('Token confirmation exception:', error)
      return NextResponse.redirect(`${origin}/profile?error=confirmation_exception`)
    }
  }

  if (code) {
    try {
      
      console.log('Processing auth callback with code:', code, 'type:', type)
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        
        // メール確認エラーの場合
        if (type === 'signup' || next.includes('/auth/confirm')) {
          return NextResponse.redirect(`${origin}/auth/confirm?error=confirmation_failed&message=${encodeURIComponent(error.message)}`)
        }
        
        // OAuth/ログインエラーの場合
        return NextResponse.redirect(`${origin}/auth/login?error=callback_error&message=${encodeURIComponent(error.message)}`)
      }
      
      if (data?.user) {
        console.log('Auth callback successful for user:', data.user.id, data.user.email)
        
        // ユーザー情報をusersテーブルに保存/更新（メール確認完了時は常に実行）
        console.log('User metadata:', data.user.user_metadata)
        console.log('Email confirmed at:', data.user.email_confirmed_at)
        console.log('Always upserting user data on email confirmation')
        
        // メール確認完了時は常にusersテーブルにデータを保存
        {
          try {
            // カスタムユーザーIDを生成（12文字のランダム英数字、重複チェック付き）
            const generateUniqueCustomUserId = async () => {
              const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
              let attempts = 0
              const maxAttempts = 10
              
              while (attempts < maxAttempts) {
                let result = ''
                for (let i = 0; i < 12; i++) {
                  result += chars.charAt(Math.floor(Math.random() * chars.length))
                }
                
                // 既存チェック
                const { data: existing } = await supabase
                  .from('users')
                  .select('id')
                  .eq('custom_user_id', result)
                  .single()
                
                if (!existing) {
                  return result
                }
                
                attempts++
                console.log(`Custom user ID collision detected: ${result}, retrying...`)
              }
              
              throw new Error('Failed to generate unique custom_user_id after multiple attempts')
            }

            const userData = {
              id: data.user.id,
              email: data.user.email,
              username: data.user.user_metadata?.username || null,
              birth_date: data.user.user_metadata?.birth_date || null,
              gender: data.user.user_metadata?.gender || null,
              agree_marketing: data.user.user_metadata?.agree_marketing || false,
              provider: 'email',
              sign_in_time: new Date().toISOString(),
              custom_user_id: await generateUniqueCustomUserId(),
            }
            
            console.log('Upserting user data:', userData)
            
            const { error: upsertError } = await supabase
              .from('users')
              .upsert(userData, {
                onConflict: 'id'
              })

            if (upsertError) {
              console.error('User data upsert error:', upsertError)
            } else {
              console.log('User data upserted successfully')
            }
          } catch (upsertError) {
            console.error('User data upsert exception:', upsertError)
          }
        }
        
        // Clear authentication cache
        revalidatePath('/', 'layout')
        revalidatePath('/')
        
        // メール確認完了の場合 - 自動ログインしてホームページへ
        if (type === 'signup' || next.includes('/auth/confirm')) {
          console.log('Email confirmation complete - redirecting to home')
          return NextResponse.redirect(`${origin}/`)
        }
        
        // 通常のログイン/OAuth完了の場合
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      
      // メール確認中の例外
      if (type === 'signup' || next.includes('/auth/confirm')) {
        return NextResponse.redirect(`${origin}/auth/confirm?error=confirmation_exception`)
      }
      
      // その他の例外
      return NextResponse.redirect(`${origin}/auth/login?error=callback_exception`)
    }
  }

  // コードが提供されていない場合
  console.error('Auth callback: No code provided')
  if (type === 'signup' || next.includes('/auth/confirm')) {
    return NextResponse.redirect(`${origin}/auth/confirm?error=no_code`)
  }
  
  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}