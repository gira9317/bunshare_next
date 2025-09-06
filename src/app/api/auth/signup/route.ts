import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signupSchema } from '@/features/auth/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // バリデーション
    const validatedFields = signupSchema.safeParse(body)
    
    if (!validatedFields.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: validatedFields.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }

    const { username, email, password, birthDate, gender, agreeMarketing } = validatedFields.data

    const supabase = await createClient()
    const { origin } = new URL(request.url)

    // Supabaseでユーザー作成（メール確認必須）
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/api/auth/callback?next=/auth/confirm`,
        data: {
          username,
          birth_date: birthDate,
          gender: gender || null,
          agree_marketing: agreeMarketing || false,
        }
      }
    })

    if (error) {
      console.error('Supabase signup error:', error)
      
      // 既存ユーザーの場合
      if (error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に使用されています' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'アカウントの作成に失敗しました' },
        { status: 400 }
      )
    }

    // メール確認が必要な場合
    if (data.user && !data.session) {
      return NextResponse.json({
        success: true,
        message: '確認メールを送信しました。メールをご確認ください。',
        requiresConfirmation: true,
        email: email
      })
    }

    // 即座にログインされた場合（メール確認不要設定の場合）
    if (data.user && data.session) {
      return NextResponse.json({
        success: true,
        message: 'アカウントを作成しました',
        user: data.user,
        session: data.session
      })
    }

    return NextResponse.json({
      success: true,
      message: 'アカウントを作成しました'
    })
    
  } catch (error) {
    console.error('サインアップエラー:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}