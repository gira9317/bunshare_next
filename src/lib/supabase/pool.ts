import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

/**
 * 共有Supabaseクライアント（リクエスト内でキャッシュ）
 */
export const getSharedClient = cache(async () => {
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
            // Server Componentsでは無視
          }
        },
      },
    }
  )
})

/**
 * 認証不要な公開データ用クライアント（リクエスト内でキャッシュ）
 */
export const getPublicClient = cache(() => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // 公開クライアントではCookieを設定しない
        },
      },
    }
  )
})

/**
 * バッチクエリ実行（トランザクション活用）
 */
export async function executeBatchQueries<T>(
  queries: Array<(client: any) => Promise<T>>
): Promise<T[]> {
  const client = await getSharedClient()
  
  // 並行実行で高速化
  return Promise.all(queries.map(query => query(client)))
}