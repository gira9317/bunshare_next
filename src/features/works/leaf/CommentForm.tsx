'use client'

import { useState } from 'react'
import { addCommentAction } from '../server/interactions'
import { Comment } from '../types'
import { cn } from '@/lib/utils'

interface CommentFormProps {
  workId: string
  onCommentAdded?: (comment: Comment) => void
}

export function CommentForm({ workId, onCommentAdded }: CommentFormProps) {
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim()) {
      setError('コメントを入力してください')
      return
    }

    if (comment.length > 1000) {
      setError('コメントは1000文字以内で入力してください')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await addCommentAction(workId, comment)

    if (result.success && result.comment) {
      setComment('')
      onCommentAdded?.(result.comment)
    } else {
      setError(result.error || 'コメントの投稿に失敗しました')
    }

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          コメントを投稿
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            setError(null)
          }}
          placeholder="作品の感想を書いてください..."
          className={cn(
            "w-full p-3 rounded-lg resize-none",
            "border border-gray-300",
            "bg-white",
            "text-gray-900",
            "placeholdertext-gray-400",
            "focus:ring-2 focus:ring-purple-500 focus:border-transparent",
            "transition-colors",
            error && "border-red-500 focus:ring-red-500"
          )}
          rows={4}
          maxLength={1000}
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center mt-2">
          <span className={cn(
            "text-xs",
            comment.length > 900 ? "text-orange-500" : "text-gray-500"
          )}>
            {comment.length} / 1000
          </span>
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
          className={cn(
            "px-6 py-2 rounded-lg font-medium transition-all",
            "bg-purple-600 text-white hover:bg-purple-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              投稿中...
            </span>
          ) : (
            'コメントを投稿'
          )}
        </button>
      </div>
    </form>
  )
}