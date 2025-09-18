'use client'

import { Work } from '../types'
import Image from 'next/image'
import { Calendar, User, Eye, Heart, MessageCircle, Bookmark } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { convertUTCToJST } from '@/lib/utils/timezone'
import { useState } from 'react'
import { toggleLikeAction, toggleBookmarkAction } from '../server/actions'
import { cn } from '@/lib/utils'

interface WorkDetailHeaderSectionProps {
  work: Work
  isLiked: boolean
  isBookmarked: boolean
}

export function WorkDetailHeaderSection({ 
  work, 
  isLiked: initialIsLiked, 
  isBookmarked: initialIsBookmarked 
}: WorkDetailHeaderSectionProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [isLiking, setIsLiking] = useState(false)
  const [isBookmarking, setIsBookmarking] = useState(false)

  const handleLike = async () => {
    if (isLiking) return
    
    console.log('🔍 [いいねボタンクリック]', {
      work_id: work.work_id,
      現在の状態_isLiked: isLiked,
      初期状態_initialIsLiked: initialIsLiked,
      操作: isLiked ? '削除予定' : '追加予定'
    })
    
    setIsLiking(true)
    setIsLiked(!isLiked)
    
    console.log('📡 [Server Action呼び出し中...]')
    const result = await toggleLikeAction(work.work_id)
    console.log('📡 [Server Action結果]', result)
    
    if (result.error) {
      setIsLiked(isLiked)
      console.error('❌ いいねエラー:', result.error)
    } else {
      console.log('✅ いいね処理成功:', {
        新しい状態: result.liked ? 'いいね済み' : 'いいね解除',
        work_id: work.work_id
      })
    }
    
    setIsLiking(false)
  }

  const handleBookmark = async () => {
    if (isBookmarking) return
    
    setIsBookmarking(true)
    setIsBookmarked(!isBookmarked)
    
    const result = await toggleBookmarkAction(work.work_id)
    
    if (result.error) {
      setIsBookmarked(isBookmarked)
      console.error('ブックマークエラー:', result.error)
    }
    
    setIsBookmarking(false)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー画像 */}
      {work.image_url && (
        <div className="relative h-64 md:h-80 -mx-4 md:mx-0 md:rounded-xl overflow-hidden">
          <Image
            src={work.image_url}
            alt={work.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* カテゴリバッジ */}
          {work.category && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full">
                {work.category}
              </span>
            </div>
          )}
        </div>
      )}

      {/* タイトルと基本情報 */}
      <div className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {work.title}
        </h1>

        {/* 作者と投稿日 */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <a 
            href={`/app/profile/${work.user_id}`}
            className="flex items-center gap-1 hovertext-purple-400 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>{work.author}</span>
          </a>
          
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <time dateTime={work.created_at}>
              {formatDistanceToNow(convertUTCToJST(work.created_at), { 
                addSuffix: true, 
                locale: ja 
              })}
            </time>
          </div>
        </div>

        {/* 統計情報とアクション */}
        <div className="flex flex-wrap items-center gap-4">
          {/* 統計 */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{work.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{work.likes || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{work.comments || 0}</span>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                "hover:scale-105 active:scale-95",
                isLiked
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span>{isLiked ? "いいね済み" : "いいね"}</span>
            </button>

            <button
              onClick={handleBookmark}
              disabled={isBookmarking}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                "hover:scale-105 active:scale-95",
                isBookmarked
                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
              <span>{isBookmarked ? "保存済み" : "保存"}</span>
            </button>
          </div>
        </div>

        {/* 概要 */}
        {work.description && (
          <p className="text-gray-700 leading-relaxed">
            {work.description}
          </p>
        )}

        {/* タグ */}
        {work.tags && work.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {work.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-sm text-gray-700 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}