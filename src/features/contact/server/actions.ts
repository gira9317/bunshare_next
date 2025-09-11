'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

export interface ContactFormData {
  name: string
  email?: string
  device?: string
  category?: string
  message: string
}

export interface ContactSubmissionResult {
  success: boolean
  error?: string
  messageId?: string
}

/**
 * お問い合わせを送信する
 */
export async function submitContactAction(formData: ContactFormData): Promise<ContactSubmissionResult> {
  const supabase = await createClient()
  
  try {
    // バリデーション
    if (!formData.name?.trim()) {
      return { success: false, error: 'お名前を入力してください' }
    }
    
    if (!formData.message?.trim()) {
      return { success: false, error: 'お問い合わせ内容を入力してください' }
    }
    
    if (formData.message.length > 2000) {
      return { success: false, error: 'お問い合わせ内容は2000文字以内で入力してください' }
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return { success: false, error: '有効なメールアドレスを入力してください' }
    }

    // ユーザー認証情報を取得（認証は必須ではない）
    const { data: { user } } = await supabase.auth.getUser()
    
    // ブラウザ情報を取得（サーバーサイドでは限定的）
    const browserInfo = {
      timestamp: new Date().toISOString(),
      serverRendered: true
    }
    
    // contact_messagesテーブルに挿入
    const { data: contactMessage, error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        user_id: user?.id || null, // 認証ユーザーの場合はuser_id、匿名の場合はnull
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        device: formData.device?.trim() || null,
        category: formData.category || null,
        message: formData.message.trim(),
        status: 'new',
        browser_info: browserInfo,
        user_agent: null // サーバーサイドでは取得不可
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Contact message insert error:', insertError)
      return { 
        success: false, 
        error: 'お問い合わせの送信に失敗しました。時間をおいて再度お試しください。' 
      }
    }

    // 管理者向けのキャッシュを無効化（将来の管理画面用）
    revalidateTag('contact_messages')
    
    return { 
      success: true, 
      messageId: contactMessage.id.toString() 
    }
    
  } catch (error) {
    console.error('Contact submission error:', error)
    return { 
      success: false, 
      error: 'システムエラーが発生しました。時間をおいて再度お試しください。' 
    }
  }
}

// 注: 管理者機能は削除済み
// お問い合わせの管理は以下の方法で行ってください：
// 1. DB直接操作
// 2. service_roleを使用したバックエンド処理
// 3. 専用の管理画面（service_role経由）