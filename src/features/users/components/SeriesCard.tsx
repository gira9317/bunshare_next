import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Series } from '../schemas'
import { Library } from 'lucide-react'

interface SeriesCardProps {
  series: Series
  className?: string
  onClick?: () => void
}

export function SeriesCard({ series, className, onClick }: SeriesCardProps) {
  const workImages = series.work_images || []
  
  // メイン画像（シリーズカバー画像または最新作品画像）を設定
  const mainImage = series.cover_image_url || series.latest_work_image
  
  // スタック用画像は作品画像のみ使用（メイン画像と重複する場合は除外）
  const stackImages = workImages.filter(img => img !== mainImage)
  
  // 表示用画像配列（メイン + スタック用）
  const displayImages = mainImage ? [mainImage, ...stackImages] : stackImages
  
  // 最大3枚まで表示
  const imagesToShow = displayImages.slice(0, 3)
  const remainingCount = Math.max(0, (series.works_count || 0) - 3)
  
  return (
    <div 
      className={cn(
        'group relative cursor-pointer',
        'h-[220px]',
        className
      )}
      onClick={onClick}
    >
      {/* 3枚目のカード（一番後ろ） */}
      {(stackImages.length >= 2 || ((series.works_count || 0) >= 3)) && (
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
              <Library className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>
      )}
      
      {/* 2枚目のカード（真ん中） */}
      {(stackImages.length >= 1 || ((series.works_count || 0) >= 2)) && (
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
              <Library className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>
      )}
      
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
        {mainImage ? (
          <div className="absolute inset-0">
            <Image
              src={mainImage}
              alt={series.title}
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
            <Library className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {/* Content container */}
        <div className="relative z-10 h-full p-3 sm:p-4 flex flex-col justify-between">
          {/* Header section */}
          <div className="space-y-1">
            {/* Series Badge */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1',
                'bg-purple-600/90 backdrop-blur-sm text-white'
              )}>
                <Library className="w-3 h-3" />
                シリーズ
              </div>
            </div>

            <h3 className={cn(
              'font-bold text-sm sm:text-base md:text-lg lg:text-base xl:text-sm leading-tight line-clamp-2',
              'transition-colors duration-300',
              mainImage
                ? 'text-white group-hover:text-gray-100'
                : 'text-gray-900 group-hover:text-purple-600'
            )}>
              {series.title}
            </h3>
          </div>

          {/* Description */}
          {series.description && (
            <p className={cn(
              'text-xs sm:text-sm leading-relaxed line-clamp-2 my-2',
              'transition-all duration-300',
              mainImage
                ? 'text-gray-100 group-hover:text-white'
                : 'text-gray-700'
            )}>
              {series.description}
            </p>
          )}

          {/* Work Meta Section */}
          <div className="work-meta">
            <div className="work-stats flex justify-between items-center">
              {/* Left side - Episode Count */}
              <div className="stat-group-left">
                <div className="work-category">
                  <span className={cn(
                    "category-tag-brand px-2 py-1 text-xs font-semibold rounded-full",
                    mainImage
                      ? "bg-white/20 backdrop-blur-sm text-white"
                      : "bg-gray-500 text-white"
                  )}>
                    {(series.works_count || 0) > 0 
                      ? `全${series.works_count}話`
                      : 'シリーズ'
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