import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/features/auth/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // バリデーション
    const validatedFields = loginSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }
    
    console.log('ログイン処理:', validatedFields.data)
    
    // Supabase認証の実装
    const supabase = await createClient()
    const { email, password } = validatedFields.data
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Supabase認証エラー:', error)
      return NextResponse.json(
        { 
          error: 'ログインに失敗しました',
          details: error.message 
        },
        { status: 401 }
      )
    }
    
    console.log('ログイン成功:', { userId: data.user?.id, email: data.user?.email })
    
    return NextResponse.json(
      { 
        success: true,
        message: 'ログインに成功しました',
        user: {
          id: data.user?.id,
          email: data.user?.email
        }
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('ログインエラー:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}