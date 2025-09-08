'use client'

import { useState, useEffect } from 'react'
import { Comment } from '../types'
import { CommentCard } from '../leaf/CommentCard'
import { CommentForm } from '../leaf/CommentForm'
import { getCommentsAction } from '../server/interactions'
import { MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkDetailCommentsSectionProps {
  workId: string
  userId?: string
}

const COMMENTS_PER_PAGE = 10

export function WorkDetailCommentsSection({ 
  workId, 
  userId 
}: WorkDetailCommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalComments, setTotalComments] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(totalComments / COMMENTS_PER_PAGE)

  useEffect(() => {
    loadComments()
  }, [currentPage])

  const loadComments = async () => {
    setIsLoading(true)
    setError(null)
    
    const offset = (currentPage - 1) * COMMENTS_PER_PAGE
    const result = await getCommentsAction(workId, COMMENTS_PER_PAGE, offset)
    
    if (result.success && result.comments) {
      setComments(result.comments)
      setTotalComments(result.total)
    } else {
      setError(result.error || 'コメントの取得に失敗しました')
    }
    
    setIsLoading(false)
  }

  const handleCommentAdded = (newComment: Comment) => {
    if (currentPage === 1) {
      setComments([newComment, ...comments.slice(0, COMMENTS_PER_PAGE - 1)])
    }
    setTotalComments(totalComments + 1)
  }

  const handleCommentDeleted = (reviewId: string) => {
    setComments(comments.filter(c => c.review_id !== reviewId))
    setTotalComments(Math.max(0, totalComments - 1))
  }

  const handleCommentUpdated = (updatedComment: Comment) => {
    setComments(comments.map(c => 
      c.review_id === updatedComment.review_id ? updatedComment : c
    ))
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
        <MessageCircle className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          コメント
        </h2>
        <span className="text-sm text-gray-500">
          ({totalComments}件)
        </span>
      </div>

      {/* コメント投稿フォーム */}
      {userId && (
        <div className="mb-6">
          <CommentForm 
            workId={workId} 
            onCommentAdded={handleCommentAdded}
          />
        </div>
      )}

      {/* コメント一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>まだコメントがありません</p>
          {userId && (
            <p className="text-sm mt-2">最初のコメントを投稿してみましょう</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentCard
              key={comment.review_id}
              comment={comment}
              currentUserId={userId}
              onDelete={handleCommentDeleted}
              onUpdate={handleCommentUpdated}
            />
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 7) return true
                if (page === 1 || page === totalPages) return true
                if (Math.abs(page - currentPage) <= 2) return true
                return false
              })
              .map((page, index, pages) => (
                <div key={page} className="flex items-center">
                  {index > 0 && pages[index - 1] !== page - 1 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      "w-10 h-10 rounded-lg transition-colors",
                      currentPage === page
                        ? "bg-purple-600 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    {page}
                  </button>
                </div>
              ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}