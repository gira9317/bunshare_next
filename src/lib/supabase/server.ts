import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSharedClient } from './pool'

export async function createClient() {
  // 共有プールを優先利用（高速化）
  return getSharedClient()
}

// 後方互換性のため旧実装も保持
export async function createDirectClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // This can be ignored in Server Components
          }
        },
      },
    }
  )
}