'use server'

import { redirect } from 'next/navigation'
import { loginSchema, signupSchema, forgotPasswordSchema } from '../schemas'

export async function loginAction(formData: FormData) {
  const rawFormData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validatedFields = loginSchema.safeParse(rawFormData)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    // TODO: Supabaseログイン実装
    console.log('ログイン処理:', validatedFields.data)
    
    // 成功時はメインアプリにリダイレクト
    redirect('/')
  } catch (error) {
    return {
      errors: {
        _form: ['ログインに失敗しました。メールアドレスまたはパスワードを確認してください。'],
      },
    }
  }
}

export async function signupAction(formData: FormData) {
  const rawFormData = {
    username: formData.get('username') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    passwordConfirm: formData.get('passwordConfirm') as string,
    birthDate: formData.get('birthDate') as string,
    gender: formData.get('gender') as string || null,
    agreeTerms: formData.get('agreeTerms') === 'on',
    agreeMarketing: formData.get('agreeMarketing') === 'on',
  }

  const validatedFields = signupSchema.safeParse(rawFormData)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    // TODO: Supabaseサインアップ実装
    console.log('サインアップ処理:', validatedFields.data)
    
    // 成功時は確認メール送信完了ページにリダイレクト
    redirect('/auth/verify-email')
  } catch (error) {
    return {
      errors: {
        _form: ['アカウント作成に失敗しました。しばらく時間をおいてから再度お試しください。'],
      },
    }
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const rawFormData = {
    email: formData.get('email') as string,
  }

  const validatedFields = forgotPasswordSchema.safeParse(rawFormData)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get origin for redirect URL
    const origin = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' // TODO: Replace with actual domain
      : 'http://localhost:3000'

    const { error } = await supabase.auth.resetPasswordForEmail(
      validatedFields.data.email,
      {
        redirectTo: `${origin}/api/auth/callback?next=/auth/reset-password`
      }
    )

    if (error) {
      console.error('Password reset error:', error)
      return {
        errors: {
          _form: ['パスワードリセットメールの送信に失敗しました。メールアドレスをご確認ください。'],
        },
      }
    }
    
    return {
      success: true,
      message: 'パスワードリセット用のリンクを送信しました。メールをご確認ください。',
    }
  } catch (error) {
    console.error('Password reset exception:', error)
    return {
      errors: {
        _form: ['パスワードリセットメールの送信に失敗しました。しばらく時間をおいてから再度お試しください。'],
      },
    }
  }
}

export async function signInWithGoogle() {
  const { createClient } = await import('@/lib/supabase/server')
  
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('Google OAuth error:', error)
    redirect('/auth/login?error=google_auth_failed')
  }

  if (data.url) {
    redirect(data.url)
  }
  
  // Fallback redirect if no URL is provided
  redirect('/auth/login?error=google_auth_no_url')
}