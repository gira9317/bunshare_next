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

/**
 * 管理者用: お問い合わせ一覧を取得
 */
export async function getContactMessagesAction(
  page: number = 1, 
  limit: number = 20,
  status?: string,
  category?: string
) {
  const supabase = await createClient()
  
  try {
    // 管理者権限をチェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'ログインが必要です' }
    }
    
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!userProfile?.is_admin) {
      return { success: false, error: '管理者権限が必要です' }
    }
    
    // クエリの構築
    let query = supabase
      .from('contact_messages')
      .select(`
        id,
        user_id,
        name,
        email,
        device,
        category,
        message,
        status,
        admin_notes,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
    
    // フィルタの適用
    if (status) {
      query = query.eq('status', status)
    }
    
    if (category) {
      query = query.eq('category', category)
    }
    
    // ページネーション
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    const { data: messages, error } = await query
    
    if (error) {
      console.error('Contact messages fetch error:', error)
      return { success: false, error: 'お問い合わせの取得に失敗しました' }
    }
    
    // 総件数を取得
    let countQuery = supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
    
    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    
    if (category) {
      countQuery = countQuery.eq('category', category)
    }
    
    const { count, error: countError } = await countQuery
    
    if (countError) {
      console.error('Contact messages count error:', countError)
    }
    
    return { 
      success: true, 
      messages: messages || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
    
  } catch (error) {
    console.error('Get contact messages error:', error)
    return { success: false, error: 'システムエラーが発生しました' }
  }
}

/**
 * 管理者用: お問い合わせのステータスを更新
 */
export async function updateContactStatusAction(
  messageId: string,
  status: 'new' | 'in_progress' | 'resolved' | 'closed',
  adminNotes?: string
) {
  const supabase = await createClient()
  
  try {
    // 管理者権限をチェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'ログインが必要です' }
    }
    
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!userProfile?.is_admin) {
      return { success: false, error: '管理者権限が必要です' }
    }
    
    // ステータスとメモを更新
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }
    
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes.trim() || null
    }
    
    const { error } = await supabase
      .from('contact_messages')
      .update(updateData)
      .eq('id', messageId)
    
    if (error) {
      console.error('Contact status update error:', error)
      return { success: false, error: 'ステータスの更新に失敗しました' }
    }
    
    // キャッシュを無効化
    revalidateTag('contact_messages')
    
    return { success: true }
    
  } catch (error) {
    console.error('Update contact status error:', error)
    return { success: false, error: 'システムエラーが発生しました' }
  }
}

/**
 * 管理者用: お問い合わせを削除（GDPR対応）
 */
export async function deleteContactMessageAction(messageId: string) {
  const supabase = await createClient()
  
  try {
    // 管理者権限をチェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'ログインが必要です' }
    }
    
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!userProfile?.is_admin) {
      return { success: false, error: '管理者権限が必要です' }
    }
    
    // メッセージを削除
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', messageId)
    
    if (error) {
      console.error('Contact delete error:', error)
      return { success: false, error: 'お問い合わせの削除に失敗しました' }
    }
    
    // キャッシュを無効化
    revalidateTag('contact_messages')
    
    return { success: true }
    
  } catch (error) {
    console.error('Delete contact message error:', error)
    return { success: false, error: 'システムエラーが発生しました' }
  }
}