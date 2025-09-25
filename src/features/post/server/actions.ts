'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * シリーズの最新エピソード番号を取得
 */
export async function getLatestEpisodeNumberAction(seriesId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // シリーズの最新エピソード番号を取得
    const { data, error } = await supabase
      .from('works')
      .select('episode_number')
      .eq('series_id', seriesId)
      .eq('user_id', user.id)
      .not('episode_number', 'is', null)
      .order('episode_number', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }

    const nextEpisodeNumber = data?.episode_number ? data.episode_number + 1 : 1
    return { success: true, nextEpisodeNumber }
  } catch (error) {
    console.error('最新エピソード番号取得エラー:', error)
    return { error: '最新エピソード番号の取得に失敗しました' }
  }
}

/**
 * シリーズを作成
 */
export async function createSeriesAction(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // FormDataから値を取得
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const imageFile = formData.get('image_file') as File | null

    // バリデーション
    if (!title || title.trim().length === 0) {
      return { error: 'シリーズタイトルは必須です' }
    }

    let coverImageUrl: string | null = null

    // 画像がある場合はアップロード処理
    if (imageFile && imageFile.size > 0) {
      try {
        // ファイル名を生成（タイムスタンプ + ランダム文字列）
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const fileExtension = imageFile.name.split('.').pop()
        const fileName = `${timestamp}-${randomString}.${fileExtension}`

        // Supabase Storageにアップロード
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('work-assets')
          .upload(`series/${fileName}`, imageFile, {
            contentType: imageFile.type,
            upsert: false
          })

        if (uploadError) {
          console.error('シリーズ画像アップロードエラー:', uploadError)
          return { error: '画像のアップロードに失敗しました: ' + uploadError.message }
        }

        // 公開URLを生成
        const { data: publicUrlData } = supabase.storage
          .from('work-assets')
          .getPublicUrl(uploadData.path)

        coverImageUrl = publicUrlData.publicUrl

      } catch (error) {
        console.error('シリーズ画像処理エラー:', error)
        return { error: '画像の処理中にエラーが発生しました' }
      }
    }

    // シリーズデータを作成
    const seriesData = {
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      cover_image_url: coverImageUrl
    }

    // Supabaseに挿入
    const { data, error } = await supabase
      .from('series')
      .insert(seriesData)
      .select()
      .single()

    if (error) {
      console.error('シリーズ作成エラー:', error)
      return { error: 'シリーズの作成に失敗しました: ' + error.message }
    }

    // キャッシュを無効化
    revalidateTag(`user:${user.id}:series`)

    return { 
      success: true, 
      series: {
        series_id: data.id,
        title: data.title,
        description: data.description,
        cover_image_url: data.cover_image_url
      }
    }
  } catch (error) {
    console.error('シリーズ作成予期しないエラー:', error)
    return { error: 'シリーズの作成中にエラーが発生しました' }
  }
}

/**
 * 作品を作成（works featureのcreateWorkActionのプロキシ）
 */
export async function createWorkAction(formData: FormData) {
  // works featureのcreateWorkActionを動的インポートして実行
  const { createWorkAction: originalAction } = await import('@/features/works/server/creation')
  return originalAction(formData)
}