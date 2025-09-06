import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/profile'

  const supabase = await createClient()

  // Handle code-based confirmation (standard auth flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(new URL(`${next}?success=email_confirmed`, request.url))
    }
  }

  // Handle token_hash-based confirmation (email change)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any
    })
    
    if (!error) {
      // Email change successful
      if (type === 'email_change') {
        return NextResponse.redirect(new URL(`${next}?success=email_changed`, request.url))
      }
      return NextResponse.redirect(new URL(`${next}?success=confirmed`, request.url))
    } else {
      console.error('Email confirmation error:', error)
    }
  }

  // If there's an error, redirect to profile with error
  return NextResponse.redirect(new URL(`${next}?error=confirmation_failed`, request.url))
}