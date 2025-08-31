import { NextRequest, NextResponse } from 'next/server'
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
    
    // TODO: Supabase認証の実装
    console.log('サインアップ処理:', validatedFields.data)
    
    // 仮の成功レスポンス
    return NextResponse.json(
      { 
        success: true,
        message: 'アカウントを作成しました' 
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('サインアップエラー:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}