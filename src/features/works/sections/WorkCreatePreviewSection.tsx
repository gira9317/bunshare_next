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
    // TODO: 実際のフォームデータから収集
    const formData = {
      title: (document.querySelector('input[name="title"]') as HTMLInputElement)?.value || '無題の作品',
      description: (document.querySelector('textarea[name="description"]') as HTMLTextAreaElement)?.value || '',
      category: '小説', // TODO: 実際の選択値を取得
      content: '', // TODO: エディターから取得
      image_url: '', // TODO: アップロードした画像URL
      tags: [], // TODO: タグ入力から取得
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0,
      likes: 0,
      comments: 0,
    } as Work
  }

  const handleSubmit = async (type: 'publish' | 'draft') => {
    console.log('🚀 [WorkCreatePreview] Submit started:', { type })
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
      const adultCheckbox = document.querySelector('input[name="is_adult_content"]') as HTMLInputElement
      const commentsCheckbox = document.querySelector('input[name="allow_comments"]') as HTMLInputElement
      
      console.log('🔍 [WorkCreatePreview] Additional elements found:', {
        tagsInput: !!tagsInput,
        imageInput: !!imageInput,
        seriesSelect: !!seriesSelect,
        episodeInput: !!episodeInput,
        adultCheckbox: !!adultCheckbox,
        commentsCheckbox: !!commentsCheckbox
      })
      
      if (tagsInput?.value) formData.append('tags', tagsInput.value)
      if (imageInput?.value) formData.append('image_url', imageInput.value)
      if (seriesSelect?.value) formData.append('series_id', seriesSelect.value)
      if (episodeInput?.value) formData.append('episode_number', episodeInput.value)
      if (adultCheckbox?.checked) formData.append('is_adult_content', 'true')
      if (commentsCheckbox?.checked !== false) formData.append('allow_comments', 'true')
      
      // 公開設定
      formData.append('publish_timing', type === 'publish' ? 'now' : 'draft')
      
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
          router.push(`/works/${result.workId}`)
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <span className="text-2xl">👀</span>
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