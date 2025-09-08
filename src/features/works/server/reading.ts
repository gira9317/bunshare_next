'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getJSTAsUTC } from '@/lib/utils/timezone'

/**
 * 読書進捗を更新（reading_progressテーブルのみ使用）
 */
export async function updateReadingProgressAction(workId: string, progressPercent: number, scrollPosition?: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const now = new Date()
    const isCompleted = progressPercent >= 100

    // reading_progressテーブルのみに保存
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        work_id: workId,
        progress_percentage: Math.min(progressPercent, 100), // 100%を超えないよう制限
        last_read_position: scrollPosition || 0,
        last_read_at: now.toISOString(),
        completed_at: isCompleted ? now.toISOString() : null,
        updated_at: now.toISOString()
      }, {
        onConflict: 'user_id,work_id'
      })

    if (error) throw error

    // キャッシュを無効化
    revalidateTag(`work:${workId}`)
    revalidateTag(`user:${user.id}:reading_progress`)

    return { success: true, completed: isCompleted }
  } catch (error) {
    console.error('読書進捗更新エラー:', error)
    return { error: '読書進捗の保存に失敗しました' }
  }
}

/**
 * ユーザーの読書進捗を取得
 */
export async function getReadingProgressAction(workId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_id', workId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return { success: true, progress: null }
      }
      throw error
    }

    return { 
      success: true, 
      progress: {
        percentage: data.progress_percentage || 0,
        position: data.last_read_position || 0,
        lastReadAt: data.last_read_at,
        completed: !!data.completed_at
      }
    }
  } catch (error) {
    console.error('読書進捗取得エラー:', error)
    return { error: '読書進捗の取得に失敗しました' }
  }
}