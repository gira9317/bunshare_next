'use client'

import { Work } from '../types'
import { Share2, Flag, Heart, Bookmark } from 'lucide-react'
import { useState } from 'react'
import { ShareModal } from '@/components/domain/ShareModal'
import { BookmarkModal } from '@/components/domain/BookmarkModal'
import { cn } from '@/lib/utils'

interface WorkDetailActionsSectionProps {
  work: Work
  isLiked: boolean
  isBookmarked: boolean
}

export function WorkDetailActionsSection({ 
  work,
  isLiked,
  isBookmarked
}: WorkDetailActionsSectionProps) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [showBookmarkModal, setShowBookmarkModal] = useState(false)

  const handleReport = () => {
    // TODO: 通報機能の実装
    alert('通報機能は準備中です')
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
        {/* 左側: 作品への評価 */}
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            この作品はいかがでしたか？
          </h3>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowBookmarkModal(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                "hover:scale-105 active:scale-95",
                isBookmarked
                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
              <span>ブックマークに追加</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>シェア</span>
            </button>

            <button
              onClick={handleReport}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              <Flag className="w-4 h-4" />
              <span>通報</span>
            </button>
          </div>
        </div>

        {/* 右側: 作者の他の作品 */}
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {work.author}の他の作品
          </h3>
          
          <a
            href={`/profile/${work.user_id}`}
            className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            作者のプロフィールを見る
          </a>
        </div>
      </div>

      {/* コメントセクション（将来実装） */}
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          コメント
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          コメント機能は近日公開予定です
        </p>
      </div>

      {/* モーダル */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        workId={work.work_id}
        title={work.title}
        author={work.author}
        description={work.description}
      />

      <BookmarkModal
        isOpen={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        workId={work.work_id}
        title={work.title}
        author={work.author}
      />
    </>
  )
}