import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Folder, Lock, Settings } from 'lucide-react'

interface BookmarkFolder {
  id: string
  folder_key: string
  folder_name: string
  is_private: boolean
  is_system: boolean
  sort_order?: number
  work_count?: number
  thumbnail_url?: string
  work_thumbnails?: string[] // 複数の作品サムネイル
  last_updated?: string
}

interface BookmarkFolderCardProps {
  folder: BookmarkFolder
  onFolderClick: (folderKey: string) => void
  showSettings?: boolean
  className?: string
}

export function BookmarkFolderCard({ 
  folder, 
  onFolderClick, 
  showSettings = false,
  className 
}: BookmarkFolderCardProps) {
  const workThumbnails = folder.work_thumbnails || []
  
  // メイン画像（フォルダサムネイル）を設定
  const mainImage = folder.thumbnail_url
  
  // スタック用画像は作品画像のみ使用（メイン画像と重複する場合は除外）
  const stackImages = workThumbnails.filter(img => img !== mainImage)
  
  // 表示用画像配列（メイン + スタック用）
  const displayImages = mainImage ? [mainImage, ...stackImages] : stackImages
  
  // 最大3枚まで表示
  const imagesToShow = displayImages.slice(0, 3)
  const remainingCount = Math.max(0, (folder.work_count || 0) - 3)
  
  return (
    <div 
      onClick={() => onFolderClick(folder.folder_key)}
      className={cn(
        'group relative cursor-pointer',
        'h-[220px]', // SeriesCardと同じ高さ
        className
      )}
    >
      {/* 3枚目のカード（一番後ろ） */}
      {(stackImages.length >= 2 || (folder.work_count && folder.work_count >= 3)) ? (
        <div 
          className={cn(
            "absolute inset-x-4 top-0",
            "bg-white rounded-xl overflow-hidden",
            "border border-gray-200",
            "transform rotate-[3deg] transition-all duration-500",
            "group-hover:rotate-[5deg] group-hover:translate-x-2",
            "aspect-[16/9]"
          )}
          style={{ zIndex: 0 }}
        >
          {stackImages[1] ? (
            <div className="relative w-full h-full">
              <Image
                src={stackImages[1]}
                alt=""
                fill
                className="object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Folder className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>
      ) : null}
      
      {/* 2枚目のカード（真ん中） */}
      {(stackImages.length >= 1 || (folder.work_count && folder.work_count >= 2)) ? (
        <div 
          className={cn(
            "absolute inset-x-2 top-3",
            "bg-white rounded-xl overflow-hidden",
            "border border-gray-200",
            "transform rotate-[1.5deg] transition-all duration-500",
            "group-hover:rotate-[2.5deg] group-hover:translate-x-1",
            "shadow-sm",
            "aspect-[16/9]"
          )}
          style={{ zIndex: 1 }}
        >
          {stackImages[0] ? (
            <div className="relative w-full h-full">
              <Image
                src={stackImages[0]}
                alt=""
                fill
                className="object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/25" />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Folder className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>
      ) : null}
      
      {/* メインカード（最前面） */}
      <article 
        className={cn(
          'absolute inset-x-0 top-6',
          'group/main relative bg-white rounded-xl overflow-hidden',
          'border border-gray-200',
          'hover:border-transparent hover:shadow-2xl transition-all duration-500',
          'transform hover:-translate-y-1',
          'aspect-[16/9]'
        )}
        style={{ zIndex: 2 }}
      >
        {/* Background image with enhanced overlay */}
        {imagesToShow[0] ? (
          <div className="absolute inset-0">
            <Image
              src={imagesToShow[0]}
              alt={folder.folder_name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className={cn(
              'absolute inset-0',
              'bg-gradient-to-br from-black/20 to-black/40',
              'transition-all duration-500',
              'group-hover:from-black/60 group-hover:to-black/50'
            )} />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <Folder className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {/* Content container */}
        <div className="relative z-10 h-full p-3 sm:p-4 flex flex-col justify-between">
          {/* Header section */}
          <div className="space-y-1">
            {/* Folder Badge */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1',
                'bg-purple-600/90 backdrop-blur-sm text-white'
              )}>
                <Folder className="w-3 h-3" />
                {folder.is_system ? 'システム' : 'フォルダ'}
              </div>
              {folder.is_private && (
                <div className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1',
                  'bg-red-600/90 backdrop-blur-sm text-white'
                )}>
                  <Lock className="w-3 h-3" />
                  プライベート
                </div>
              )}
            </div>

            <h3 className={cn(
              'font-bold text-sm sm:text-base md:text-lg lg:text-base xl:text-sm leading-tight line-clamp-2',
              'transition-colors duration-300',
              imagesToShow[0]
                ? 'text-white group-hover:text-gray-100'
                : 'text-gray-900 group-hover:text-purple-600'
            )}>
              {folder.folder_name}
            </h3>
          </div>

          {/* Work Meta Section */}
          <div className="work-meta">
            <div className="work-stats flex justify-between items-center">
              {/* Left side - Work Count */}
              <div className="stat-group-left">
                <div className="work-category">
                  <span className={cn(
                    "category-tag-brand px-2 py-1 text-xs font-semibold rounded-full",
                    mainImage
                      ? "bg-white/20 backdrop-blur-sm text-white"
                      : "bg-gray-500 text-white"
                  )}>
                    {folder.work_count && folder.work_count > 0 
                      ? `${folder.work_count}作品`
                      : 'フォルダ'
                    }
                  </span>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}