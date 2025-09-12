'use client'

import { useState } from 'react'
import { Eye, Save, Rocket } from 'lucide-react'
import { WorkCard } from '@/components/domain/WorkCard'
import { cn } from '@/lib/utils'
import type { Work } from '../types'
import { createWorkAction } from '../server/actions'
import { useRouter } from 'next/navigation'

export function WorkCreatePreviewSection() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // フォームデータを収集してプレビュー用の作品オブジェクトを生成
  const getPreviewWork = (): Work => {
    // 実際のフォームデータから収集
    const useSeriesImage = (document.querySelector('input[name="use_series_image"]') as HTMLInputElement)?.checked || false
    const seriesId = (document.querySelector('select[name="series_id"]') as HTMLSelectElement)?.value || ''
    
    let imageUrl = ''
    
    if (useSeriesImage && seriesId) {
      // シリーズ画像を使用する場合は、グローバルに保存されたシリーズデータから画像URLを取得
      if (typeof window !== 'undefined') {
        const selectedSeriesData = (window as any).selectedSeriesData
        if (selectedSeriesData && selectedSeriesData.cover_image_url) {
          imageUrl = selectedSeriesData.cover_image_url
          console.log('🖼️ [WorkCreatePreview] Using series image:', imageUrl.substring(0, 50) + '...')
        } else {
          console.log('📝 [WorkCreatePreview] Series selected but no cover image available')
          imageUrl = ''
        }
      }
    } else {
      // 通常の画像を使用
      imageUrl = (document.querySelector('input[name="image_url"]') as HTMLInputElement)?.value || ''
    }

    const formData = {
      title: (document.querySelector('input[name="title"]') as HTMLInputElement)?.value || '無題の作品',
      description: (document.querySelector('textarea[name="description"]') as HTMLTextAreaElement)?.value || '',
      category: (document.querySelector('input[name="category"]') as HTMLInputElement)?.value || '小説',
      content: (document.querySelector('textarea[name="content"]') as HTMLTextAreaElement)?.value || '',
      image_url: imageUrl,
      tags: (document.querySelector('input[name="tags"]') as HTMLInputElement)?.value?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
      use_series_image: useSeriesImage,
      series_id: seriesId
    }

    return {
      work_id: 'preview',
      user_id: 'current-user',
      title: formData.title,
      description: formData.description,
      category: formData.category,
      content: formData.content,
      image_url: formData.image_url,
      tags: formData.tags,
      author: 'あなた',
      author_username: 'your-username',
      created_at: new Date().toISOString(), // プレビュー用なので現在時刻でOK
      updated_at: new Date().toISOString(), // プレビュー用なので現在時刻でOK
      views: 0,
      likes: 0,
      comments: 0,
    } as Work
  }

  const handleSubmit = async (type: 'publish' | 'draft') => {
    console.log('🚀 [WorkCreatePreview] Submit started:', { type })
    console.log('🚀 [WorkCreatePreview] This function is being called!')
    setIsSubmitting(true)
    
    try {
      // フォームデータを収集
      console.log('📊 [WorkCreatePreview] Collecting form data...')
      const formData = new FormData()
      
      // 基本情報を追加
      const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement
      const descriptionTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
      const categoryHidden = document.querySelector('input[name="category"]') as HTMLInputElement
      const contentTextarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement
      
      console.log('🔍 [WorkCreatePreview] Form elements found:', {
        titleInput: !!titleInput,
        descriptionTextarea: !!descriptionTextarea,
        categoryHidden: !!categoryHidden,
        contentTextarea: !!contentTextarea,
        titleValue: titleInput?.value,
        descriptionValue: descriptionTextarea?.value,
        categoryValue: categoryHidden?.value,
        contentValue: contentTextarea?.value?.substring(0, 100) + '...'
      })
      
      if (titleInput?.value) formData.append('title', titleInput.value)
      if (descriptionTextarea?.value) formData.append('description', descriptionTextarea.value)
      if (categoryHidden?.value) formData.append('category', categoryHidden.value)
      if (contentTextarea?.value) formData.append('content', contentTextarea.value)
      
      // その他のフィールドも追加
      const tagsInput = document.querySelector('input[name="tags"]') as HTMLInputElement
      const imageInput = document.querySelector('input[name="image_url"]') as HTMLInputElement
      const seriesSelect = document.querySelector('select[name="series_id"]') as HTMLSelectElement
      const episodeInput = document.querySelector('input[name="episode_number"]') as HTMLInputElement
      const useSeriesImageCheckbox = document.querySelector('input[name="use_series_image"]') as HTMLInputElement
      const adultCheckbox = document.querySelector('input[name="is_adult_content"]') as HTMLInputElement
      const commentsCheckbox = document.querySelector('input[name="allow_comments"]') as HTMLInputElement
      
      // 画像ファイルをグローバルから取得
      const imageFile = (window as any).workImageFile as File | null
      
      console.log('🔍 [WorkCreatePreview] Additional elements found:', {
        tagsInput: !!tagsInput,
        imageInput: !!imageInput,
        imageFile: !!imageFile,
        imageFileName: imageFile?.name,
        imageFileSize: imageFile?.size,
        seriesSelect: !!seriesSelect,
        episodeInput: !!episodeInput,
        useSeriesImageCheckbox: !!useSeriesImageCheckbox,
        useSeriesImageChecked: useSeriesImageCheckbox?.checked,
        adultCheckbox: !!adultCheckbox,
        commentsCheckbox: !!commentsCheckbox
      })
      
      if (tagsInput?.value) formData.append('tags', tagsInput.value)
      
      // 画像ファイルを追加（blobURLではなく実際のFile）
      if (imageFile) {
        formData.append('image_file', imageFile)
        console.log('📎 [WorkCreatePreview] Image file added to FormData:', {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        })
      } else if (imageInput?.value) {
        formData.append('image_url', imageInput.value)
        console.log('📎 [WorkCreatePreview] Image URL added to FormData:', imageInput.value.substring(0, 50) + '...')
      }
      
      if (seriesSelect?.value) formData.append('series_id', seriesSelect.value)
      if (episodeInput?.value) formData.append('episode_number', episodeInput.value)
      if (useSeriesImageCheckbox?.checked) formData.append('use_series_image', 'true')
      if (adultCheckbox?.checked) formData.append('is_adult_content', 'true')
      if (commentsCheckbox?.checked !== false) formData.append('allow_comments', 'true')
      
      // 公開設定を取得
      const publishTimingInput = document.querySelector('input[name="publish_timing"]') as HTMLInputElement
      const scheduledAtInput = document.querySelector('input[name="scheduled_at"]') as HTMLInputElement
      
      console.log('🔍 [WorkCreatePreview] Publishing settings:', {
        publishTimingInput: !!publishTimingInput,
        publishTiming: publishTimingInput?.value,
        scheduledAtInput: !!scheduledAtInput,
        scheduledAt: scheduledAtInput?.value,
        type
      })
      
      // さらに詳細なデバッグ
      console.log('🔍 [WorkCreatePreview] All publish_timing inputs:', document.querySelectorAll('input[name="publish_timing"]'))
      console.log('🔍 [WorkCreatePreview] All scheduled_at inputs:', document.querySelectorAll('input[name="scheduled_at"]'))
      
      if (type === 'publish') {
        // 公開ボタンが押された場合は設定された公開設定を使用
        if (publishTimingInput?.value) {
          formData.append('publish_timing', publishTimingInput.value)
        } else {
          formData.append('publish_timing', 'now')
        }
        
        if (publishTimingInput?.value === 'scheduled' && scheduledAtInput?.value) {
          formData.append('scheduled_at', scheduledAtInput.value)
        }
      } else {
        // 下書きボタンが押された場合は強制的に下書き
        formData.append('publish_timing', 'draft')
      }
      
      // FormDataの内容をログ出力
      console.log('📋 [WorkCreatePreview] FormData contents:')
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`)
      }
      
      // Server Actionを呼び出し
      console.log('📞 [WorkCreatePreview] Calling createWorkAction...')
      const result = await createWorkAction(formData)
      console.log('📞 [WorkCreatePreview] createWorkAction result:', result)
      
      if (result.success && result.workId) {
        if (type === 'publish') {
          // 公開後、作品詳細ページへ遷移
          router.push(`/app/works/${result.workId}`)
        } else {
          // 下書き保存後、成功メッセージ表示
          alert('下書きを保存しました')
        }
      } else {
        alert(result.error || '保存に失敗しました')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* プレビュー表示 */}
      {showPreview && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            プレビュー
          </h2>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              作品カードは以下のように表示されます
            </p>
            
            <div className="max-w-sm mx-auto">
              <WorkCard work={getPreviewWork()} />
            </div>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* プレビューボタン */}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
              "border border-purple-600 text-purple-600",
              "hover:bg-purple-50 dark:hover:bg-purple-900/20",
              "transition-all hover:scale-105 active:scale-95",
              "font-medium"
            )}
          >
            <Eye className="w-5 h-5" />
            {showPreview ? 'プレビューを隠す' : 'プレビュー表示'}
          </button>

          {/* 下書き保存ボタン */}
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
              "bg-gray-600 hover:bg-gray-700",
              "text-white font-medium",
              "transition-all hover:scale-105 active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Save className="w-5 h-5" />
            下書き保存
          </button>

          {/* 公開ボタン */}
          <button
            type="button"
            onClick={() => handleSubmit('publish')}
            disabled={isSubmitting}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
              "bg-purple-600 hover:bg-purple-700",
              "text-white font-medium",
              "transition-all hover:scale-105 active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                処理中...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                投稿する
              </>
            )}
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            ⚠️ 投稿前に内容をよく確認してください。一度公開した作品は削除できますが、読者の記憶からは消えません。
          </p>
        </div>
      </div>
    </div>
  )
}