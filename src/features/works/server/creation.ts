'use server'

import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getJSTAsUTC, convertLocalDateTimeToUTC } from '@/lib/utils/timezone'

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
 * 作品を作成
 */
export async function createWorkAction(formData: FormData) {
  console.log('🚨🚨🚨 [createWorkAction] FUNCTION CALLED!')
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // FormDataから値を取得
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const content = formData.get('content') as string
    const category = formData.get('category') as string
    
    // タグの処理 - JSONまたはカンマ区切り文字列に対応
    let tags: string[] = []
    const tagsData = formData.get('tags') as string
    if (tagsData) {
      try {
        // まずJSONとして解析を試行
        tags = JSON.parse(tagsData)
      } catch {
        // JSON解析に失敗した場合はカンマ区切り文字列として処理
        tags = tagsData.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      }
    }
    
    let image_url = formData.get('image_url') as string
    const image_file = formData.get('image_file') as File | null
    const series_id = formData.get('series_id') as string
    const episode_number = formData.get('episode_number') ? parseInt(formData.get('episode_number') as string) : null
    const use_series_image = formData.get('use_series_image') === 'true'
    const is_adult_content = formData.get('is_adult_content') === 'true'
    const allow_comments = formData.get('allow_comments') !== 'false'
    const publish_timing = formData.get('publish_timing') as string
    const scheduled_at = formData.get('scheduled_at') as string
    console.log('🔍 [createWorkAction] Raw scheduled_at from form:', scheduled_at)
    console.log('🔍 [createWorkAction] publish_timing:', publish_timing)
    
    // デバッグ: 変換前後を確認
    if (publish_timing === 'scheduled' && scheduled_at) {
      console.log('🔍 [createWorkAction] Before conversion - scheduled_at:', scheduled_at)
      const convertedTime = convertLocalDateTimeToUTC(scheduled_at)
      console.log('🔍 [createWorkAction] After conversion - UTC:', convertedTime)
    }

    // 画像ファイルのアップロード処理
    if (image_file && image_file.size > 0) {
      try {
        // ファイル名を一意にする
        const fileExt = image_file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        // Supabase Storageにアップロード (work-assets バケット)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('work-assets')
          .upload(`headers/${fileName}`, image_file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          console.error('画像アップロードエラー:', uploadError)
          return { success: false, error: 'Image upload failed' }
        }
        
        // 公開URLを取得
        const { data: urlData } = supabase.storage
          .from('work-assets')
          .getPublicUrl(`headers/${fileName}`)
        
        image_url = urlData.publicUrl
        
      } catch (error) {
        console.error('画像アップロードエラー:', error)
        return { success: false, error: 'Image upload failed' }
      }
    }

    // バリデーション
    if (!title || !content || !category) {
      return { error: 'タイトル、本文、カテゴリは必須です' }
    }

    // 作品IDを生成
    const work_id = crypto.randomUUID()

    // シリーズ画像使用時の処理
    if (use_series_image && series_id) {
      // シリーズのcover_image_urlを取得
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .select('cover_image_url')
        .eq('id', series_id)
        .single()
      
      if (seriesError) {
        console.error('シリーズ情報取得エラー:', seriesError)
        return { error: 'シリーズ情報の取得に失敗しました: ' + seriesError.message }
      }
      
      if (seriesData?.cover_image_url) {
        image_url = seriesData.cover_image_url
      }
    }

    // デバッグ: scheduled_atの変換を確認
    console.log('🚨 [createWorkAction] About to create work data')
    console.log('🚨 [createWorkAction] publish_timing:', publish_timing)
    console.log('🚨 [createWorkAction] scheduled_at raw:', scheduled_at)
    
    // 作品データを作成
    const workData = {
      work_id,
      user_id: user.id,
      title,
      description: description || null,
      content,
      category,
      tags: tags.length > 0 ? tags : null,
      image_url: image_url || null,
      series_id: series_id || null,
      episode_number: episode_number,
      use_series_image: use_series_image,
      is_adult_content,
      allow_comments,
      is_published: publish_timing === 'now',
      scheduled_at: (() => {
        console.log('🚨 [createWorkAction] Processing scheduled_at...')
        console.log('🚨 [createWorkAction] Condition check - publish_timing:', publish_timing, 'scheduled_at:', scheduled_at)
        
        if (publish_timing === 'scheduled' && scheduled_at) {
          // datetime-localの値を日本時間として明示的に扱う
          // サーバーのタイムゾーンに関係なく、入力値は日本時間として解釈する
          // "2025-09-05T06:10" → "2025-09-05T06:10+09:00" として扱う
          const jstDateString = scheduled_at + ':00+09:00'
          const date = new Date(jstDateString)
          const result = date.toISOString()
          console.log('🚨 [createWorkAction] Converting:', scheduled_at, '→', jstDateString, '→', result)
          return result
        }
        
        console.log('🚨 [createWorkAction] Not scheduled, returning null')
        return null
      })(),
      created_at: getJSTAsUTC(),
      updated_at: getJSTAsUTC(),
      views: 0,
      likes: 0,
      comments: 0
    }

    // 作品を挿入
    const { error } = await supabase
      .from('works')
      .insert(workData)

    if (error) throw error

    // キャッシュを無効化
    revalidateTag('works')
    revalidateTag(`user:${user.id}:works`)

    return { success: true, workId: work_id }
  } catch (error) {
    console.error('作品作成エラー:', error)
    return { error: '作品の作成に失敗しました' }
  }
}

/**
 * テスト用作品を作成（開発用）
 */
export async function createTestWorkAction() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    const work_id = crypto.randomUUID()

    const testWork = {
      work_id,
      user_id: user.id,
      title: '【テスト】星降る夜の物語',
      description: '静寂な夜空に降る星たちが奏でる、美しくも切ない物語。',
      content: `第一章 星降る夜

夜空には無数の星が瞬いていた。まるで天の神々が地上の人々に向けて投げかけた祝福のようだった。

「また星を見てるの？」

背後から聞こえた声に振り返ると、幼なじみの美月が立っていた。彼女の瞳には、僕が見上げている星空と同じ光が宿っているように見えた。

「星って、本当はすごく遠くにあるのに、こんなに近くに感じるよね」

僕はそう呟きながら、再び夜空を見上げた。美月も隣に座り、同じように星を見上げる。

二人の間に流れる時間は、まるで永遠のようだった。`,
      category: '小説',
      tags: ['ファンタジー', '青春', '恋愛'],
      is_published: true,
      allow_comments: true,
      is_adult_content: false,
      views: 0,
      likes: 0,
      comments: 0,
      created_at: getJSTAsUTC(),
      updated_at: getJSTAsUTC()
    }

    const { error } = await supabase
      .from('works')
      .insert(testWork)

    if (error) throw error

    console.log('テスト作品作成完了:', { work_id, title: testWork.title })

    return { success: true, workId: work_id, title: testWork.title }
  } catch (error) {
    console.error('テスト作品作成エラー:', error)
    return { error: 'テスト作品の作成に失敗しました' }
  }
}