'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

// クライアント側でユーザー情報を取得（軽量版）
export async function getClientUser(): Promise<User | null> {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Client auth error:', error)
    return null
  }
}