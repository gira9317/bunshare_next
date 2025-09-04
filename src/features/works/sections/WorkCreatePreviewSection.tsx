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
    setIsSubmitting(true)
    
    try {
      // TODO: フォームデータを収集
      const formData = new FormData()
      
      // Server Actionを呼び出し
      const result = await createWorkAction(formData)
      
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