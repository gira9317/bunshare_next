'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { EmbeddingProcessingRequestInput } from '../schemas'

export async function triggerEmbeddingProcessing(request: EmbeddingProcessingRequestInput) {
  try {
    const supabase = await createClient()
    
    // Edge Function を呼び出し
    const { data, error } = await supabase.functions.invoke('process-embeddings-v2', {
      body: request
    })

    if (error) {
      throw error
    }

    // 関連キャッシュを無効化
    revalidateTag('embeddings')
    revalidateTag('embedding-costs')
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Error triggering embedding processing:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function reprocessWorkEmbeddings(workIds: string[]) {
  try {
    const supabase = await createClient()
    
    // 指定された作品の埋め込みステータスをpendingに戻す
    const { error: updateError } = await supabase
      .from('work_embeddings_v2')
      .update({ 
        processing_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .in('work_id', workIds)

    if (updateError) {
      throw updateError
    }

    // Edge Function を呼び出し
    const { data, error } = await supabase.functions.invoke('process-embeddings-v2', {
      body: {
        work_ids: workIds,
        force_reprocess: true,
        batch_size: Math.min(workIds.length, 20)
      }
    })

    if (error) {
      throw error
    }

    revalidateTag('embeddings')
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Error reprocessing work embeddings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function deleteWorkEmbeddings(workIds: string[]) {
  try {
    const supabase = await createClient()
    
    // チャンクを削除（CASCADE で自動削除されるが明示的に実行）
    await supabase
      .from('work_content_chunks_v2')
      .delete()
      .in('work_id', workIds)

    // 埋め込みデータを削除
    const { error } = await supabase
      .from('work_embeddings_v2')
      .delete()
      .in('work_id', workIds)

    if (error) {
      throw error
    }

    revalidateTag('embeddings')
    
    return {
      success: true,
      message: `${workIds.length}件の埋め込みデータを削除しました`
    }
  } catch (error) {
    console.error('Error deleting work embeddings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function updateEmbeddingSettings(settings: {
  auto_process: boolean
  max_daily_cost_usd: number
  batch_size: number
  processing_interval_minutes: number
}) {
  try {
    // 設定を保存する処理（例：user_preferencesテーブルなど）
    // ここでは簡単な例として、Edge Function に設定を送信
    const supabase = await createClient()
    
    const { data, error } = await supabase.functions.invoke('update-embedding-settings', {
      body: settings
    })

    if (error) {
      throw error
    }

    revalidateTag('embedding-settings')
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Error updating embedding settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function pauseEmbeddingProcessing() {
  try {
    const supabase = await createClient()
    
    // 進行中の処理を一時停止（実装は Edge Function 側で行う）
    const { data, error } = await supabase.functions.invoke('pause-embedding-processing')

    if (error) {
      throw error
    }

    revalidateTag('embedding-settings')
    
    return {
      success: true,
      message: '埋め込み処理を一時停止しました'
    }
  } catch (error) {
    console.error('Error pausing embedding processing:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function resumeEmbeddingProcessing() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.functions.invoke('resume-embedding-processing')

    if (error) {
      throw error
    }

    revalidateTag('embedding-settings')
    
    return {
      success: true,
      message: '埋め込み処理を再開しました'
    }
  } catch (error) {
    console.error('Error resuming embedding processing:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}