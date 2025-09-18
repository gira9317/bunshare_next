'use client'

import { useState } from 'react'
import { FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/utils'
import type { Work } from '../types'

interface WorkCreateDraftSectionProps {
  drafts: Work[]
}

export function WorkCreateDraftSection({ drafts }: WorkCreateDraftSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<Work | null>(null)

  const handleDraftSelect = (draft: Work) => {
    if (selectedDraft?.work_id === draft.work_id) {
      setSelectedDraft(null)
      clearForm()
    } else {
      setSelectedDraft(draft)
      loadDraftToForm(draft)
    }
  }

  const loadDraftToForm = (draft: Work) => {
    // フォーム要素に下書きデータを反映
    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement
    const descriptionTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
    const categoryInput = document.querySelector('input[name="category"]') as HTMLInputElement
    const contentTextarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement
    const tagsInput = document.querySelector('input[name="tags"]') as HTMLInputElement

    if (titleInput) titleInput.value = draft.title || ''
    if (descriptionTextarea) descriptionTextarea.value = draft.description || ''
    if (categoryInput) categoryInput.value = draft.category || '小説'
    if (contentTextarea) contentTextarea.value = draft.content || ''
    if (tagsInput) tagsInput.value = draft.tags?.join(', ') || ''

    // 画像URLも反映
    const imageInput = document.querySelector('input[name="image_url"]') as HTMLInputElement
    if (imageInput && draft.image_url) imageInput.value = draft.image_url
  }

  const clearForm = () => {
    // フォームをクリア
    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement
    const descriptionTextarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
    const contentTextarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement
    const tagsInput = document.querySelector('input[name="tags"]') as HTMLInputElement
    const imageInput = document.querySelector('input[name="image_url"]') as HTMLInputElement

    if (titleInput) titleInput.value = ''
    if (descriptionTextarea) descriptionTextarea.value = ''
    if (contentTextarea) contentTextarea.value = ''
    if (tagsInput) tagsInput.value = ''
    if (imageInput) imageInput.value = ''
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full p-6 flex items-center justify-between",
          "hover:bg-gray-750 transition-colors"
        )}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <div className="text-left">
            <h2 className="text-xl font-semibold text-gray-900">
              下書きから読み込み
            </h2>
            <p className="text-sm text-gray-500">
              {drafts.length}件の下書きがあります
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* 下書き一覧 */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-6 pt-0">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {drafts.map((draft) => (
                <div
                  key={draft.work_id}
                  onClick={() => handleDraftSelect(draft)}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    "hover:shadow-md hover:scale-[1.01]",
                    selectedDraft?.work_id === draft.work_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {draft.title || '無題の作品'}
                      </h3>
                      {draft.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {draft.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(draft.updated_at)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {draft.category}
                        </span>
                        {draft.tags && draft.tags.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {draft.tags.length}個のタグ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedDraft && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  ✅ 「{selectedDraft.title || '無題の作品'}」を読み込みました。
                  フォームを編集して再投稿できます。
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}