'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getJSTAsUTC } from '@/lib/utils/timezone'

/**
 * 読書進捗を更新
 */
export async function updateReadingProgressAction(workId: string, progress: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // reading_progressテーブルに保存
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        work_id: workId,
        progress: progress,
        updated_at: getJSTAsUTC()
      }, {
        onConflict: 'user_id,work_id'
      })

    if (error) throw error

    // reading_bookmarksにも保存（続きを読む機能用）
    if (progress > 0) {
      await supabase
        .from('reading_bookmarks')
        .upsert({
          user_id: user.id,
          work_id: workId,
          last_position: progress,
          updated_at: getJSTAsUTC()
        }, {
          onConflict: 'user_id,work_id'
        })
    }

    return { success: true }
  } catch (error) {
    console.error('読書進捗更新エラー:', error)
    return { error: '読書進捗の保存に失敗しました' }
  }
}