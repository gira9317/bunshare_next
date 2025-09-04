import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      const supabase = await createClient()
      
      console.log('Processing OAuth callback with code:', code)
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('OAuth callback error:', error)
        return NextResponse.redirect(`${origin}/auth/login?error=oauth_callback_error`)
      }
      
      if (data?.user) {
        console.log('OAuth login successful for user:', data.user.id, data.user.email)
        
        // Clear authentication cache
        revalidatePath('/', 'layout')
        revalidatePath('/')
        
        // Redirect to the intended page or home
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('OAuth callback exception:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_callback_exception`)
    }
  }

  // If no code or other error, redirect to login with error
  console.error('OAuth callback: No code provided')
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_no_code`)
}