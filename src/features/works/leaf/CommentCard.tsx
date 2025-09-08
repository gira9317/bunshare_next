'use client'

import { useState } from 'react'
import { Comment } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Trash2, Edit2, User } from 'lucide-react'
import { deleteCommentAction, editCommentAction } from '../server/interactions'
import { cn } from '@/lib/utils'

interface CommentCardProps {
  comment: Comment
  currentUserId?: string
  onDelete?: (reviewId: string) => void
  onUpdate?: (comment: Comment) => void
}

export function CommentCard({ 
  comment, 
  currentUserId,
  onDelete,
  onUpdate 
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.comment)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const isOwner = currentUserId === comment.user_id

  const handleDelete = async () => {
    if (!confirm('コメントを削除しますか？')) return
    
    setIsDeleting(true)
    const result = await deleteCommentAction(comment.review_id)
    
    if (result.success) {
      onDelete?.(comment.review_id)
    } else {
      console.error('削除エラー:', result.error)
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!editText.trim()) return
    
    setIsSaving(true)
    const result = await editCommentAction(comment.review_id, editText)
    
    if (result.success && result.comment) {
      onUpdate?.(result.comment)
      setIsEditing(false)
    } else {
      console.error('編集エラー:', result.error)
    }
    setIsSaving(false)
  }

  const handleCancel = () => {
    setEditText(comment.comment)
    setIsEditing(false)
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg space-y-3">
      {/* ユーザー情報とアクション */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <a 
            href={`/profile/${comment.user_id}`}
            className="flex-shrink-0"
          >
            {comment.user?.avatar_url ? (
              <img
                src={comment.user.avatar_url}
                alt={comment.user.username}
                className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-purple-500 transition-all"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:ring-2 hover:ring-purple-500 transition-all">
                <span className="text-white font-semibold text-sm">
                  {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </a>
          <div>
            <a 
              href={`/profile/${comment.user_id}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              {comment.user?.username || 'Unknown User'}
            </a>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { 
                addSuffix: true, 
                locale: ja 
              })}
              {comment.created_at !== comment.updated_at && (
                <span className="ml-1">(編集済み)</span>
              )}
            </p>
          </div>
        </div>
        
        {isOwner && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors"
              title="編集"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
              title="削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* コメント本文 */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editText.trim()}
              className={cn(
                "px-4 py-2 text-sm rounded-lg transition-colors",
                "bg-purple-600 text-white hover:bg-purple-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {comment.comment}
        </p>
      )}
    </div>
  )
}