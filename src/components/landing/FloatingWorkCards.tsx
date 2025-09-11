'use client'

import { LandingWork } from '@/lib/landing-works'
import Image from 'next/image'

interface FloatingWorkCardsProps {
  works: LandingWork[]
}

export function FloatingWorkCards({ works }: FloatingWorkCardsProps) {
  // モバイル: 3行, タブレット: 4行, デスクトップ: 5行
  const mobileRowSize = Math.ceil(works.length / 3)
  const tabletRowSize = Math.ceil(works.length / 4)
  const desktopRowSize = Math.ceil(works.length / 5)
  
  const mobileRows = {
    row1: works.slice(0, mobileRowSize),
    row2: works.slice(mobileRowSize, mobileRowSize * 2),
    row3: works.slice(mobileRowSize * 2)
  }
  
  const tabletRows = {
    row1: works.slice(0, tabletRowSize),
    row2: works.slice(tabletRowSize, tabletRowSize * 2),
    row3: works.slice(tabletRowSize * 2, tabletRowSize * 3),
    row4: works.slice(tabletRowSize * 3)
  }
  
  const desktopRows = {
    row1: works.slice(0, desktopRowSize),
    row2: works.slice(desktopRowSize, desktopRowSize * 2),
    row3: works.slice(desktopRowSize * 2, desktopRowSize * 3),
    row4: works.slice(desktopRowSize * 3, desktopRowSize * 4),
    row5: works.slice(desktopRowSize * 4)
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
      {/* モバイル: 3行 */}
      <div className="block md:hidden">
        {/* モバイル 1行目 */}
        <div className="absolute top-4 left-0 w-full">
          <div className="flex gap-3 animate-scroll-right">
            {[...mobileRows.row1, ...mobileRows.row1, ...mobileRows.row1].map((work, index) => (
              <WorkCardMini key={`mobile-row1-${work.id}-${index}`} work={work} size="mobile" />
            ))}
          </div>
        </div>
        {/* モバイル 2行目 */}
        <div className="absolute top-1/2 transform -translate-y-1/2 left-0 w-full">
          <div className="flex gap-3 animate-scroll-left">
            {[...mobileRows.row2, ...mobileRows.row2, ...mobileRows.row2].map((work, index) => (
              <WorkCardMini key={`mobile-row2-${work.id}-${index}`} work={work} size="mobile" />
            ))}
          </div>
        </div>
        {/* モバイル 3行目 */}
        <div className="absolute bottom-4 left-0 w-full">
          <div className="flex gap-3 animate-scroll-right">
            {[...mobileRows.row3, ...mobileRows.row3, ...mobileRows.row3].map((work, index) => (
              <WorkCardMini key={`mobile-row3-${work.id}-${index}`} work={work} size="mobile" />
            ))}
          </div>
        </div>
      </div>

      {/* タブレット: 4行 */}
      <div className="hidden md:block lg:hidden">
        {/* タブレット 1行目 */}
        <div className="absolute top-6 left-0 w-full">
          <div className="flex gap-4 animate-scroll-right">
            {[...tabletRows.row1, ...tabletRows.row1, ...tabletRows.row1].map((work, index) => (
              <WorkCardMini key={`tablet-row1-${work.id}-${index}`} work={work} size="tablet" />
            ))}
          </div>
        </div>
        {/* タブレット 2行目 */}
        <div className="absolute top-1/3 left-0 w-full">
          <div className="flex gap-4 animate-scroll-left">
            {[...tabletRows.row2, ...tabletRows.row2, ...tabletRows.row2].map((work, index) => (
              <WorkCardMini key={`tablet-row2-${work.id}-${index}`} work={work} size="tablet" />
            ))}
          </div>
        </div>
        {/* タブレット 3行目 */}
        <div className="absolute bottom-1/3 left-0 w-full">
          <div className="flex gap-4 animate-scroll-right-slow">
            {[...tabletRows.row3, ...tabletRows.row3, ...tabletRows.row3].map((work, index) => (
              <WorkCardMini key={`tablet-row3-${work.id}-${index}`} work={work} size="tablet" />
            ))}
          </div>
        </div>
        {/* タブレット 4行目 */}
        <div className="absolute bottom-6 left-0 w-full">
          <div className="flex gap-4 animate-scroll-left">
            {[...tabletRows.row4, ...tabletRows.row4, ...tabletRows.row4].map((work, index) => (
              <WorkCardMini key={`tablet-row4-${work.id}-${index}`} work={work} size="tablet" />
            ))}
          </div>
        </div>
      </div>

      {/* デスクトップ: 5行 */}
      <div className="hidden lg:block">
        {/* デスクトップ 1行目 */}
        <div className="absolute top-8 left-0 w-full">
          <div className="flex gap-8 animate-scroll-right">
            {[...desktopRows.row1, ...desktopRows.row1, ...desktopRows.row1].map((work, index) => (
              <WorkCardMini key={`desktop-row1-${work.id}-${index}`} work={work} size="desktop" />
            ))}
          </div>
        </div>
        {/* デスクトップ 2行目 */}
        <div className="absolute" style={{top: 'calc(32px + 216px + 32px)'}}>
          <div className="flex gap-8 animate-scroll-left w-full">
            {[...desktopRows.row2, ...desktopRows.row2, ...desktopRows.row2].map((work, index) => (
              <WorkCardMini key={`desktop-row2-${work.id}-${index}`} work={work} size="desktop" />
            ))}
          </div>
        </div>
        {/* デスクトップ 3行目 */}
        <div className="absolute" style={{top: 'calc(32px + 216px + 32px + 216px + 32px)'}}>
          <div className="flex gap-8 animate-scroll-right-slow w-full">
            {[...desktopRows.row3, ...desktopRows.row3, ...desktopRows.row3].map((work, index) => (
              <WorkCardMini key={`desktop-row3-${work.id}-${index}`} work={work} size="desktop" />
            ))}
          </div>
        </div>
        {/* デスクトップ 4行目 */}
        <div className="absolute" style={{top: 'calc(32px + 216px + 32px + 216px + 32px + 216px + 32px)'}}>
          <div className="flex gap-8 animate-scroll-left w-full">
            {[...desktopRows.row4, ...desktopRows.row4, ...desktopRows.row4].map((work, index) => (
              <WorkCardMini key={`desktop-row4-${work.id}-${index}`} work={work} size="desktop" />
            ))}
          </div>
        </div>
        {/* デスクトップ 5行目 */}
        <div className="absolute" style={{top: 'calc(32px + 216px + 32px + 216px + 32px + 216px + 32px + 216px + 32px)'}}>
          <div className="flex gap-8 animate-scroll-right w-full">
            {[...desktopRows.row5, ...desktopRows.row5, ...desktopRows.row5].map((work, index) => (
              <WorkCardMini key={`desktop-row5-${work.id}-${index}`} work={work} size="desktop" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkCardMini({ work, size = 'desktop' }: { work: LandingWork; size?: 'mobile' | 'tablet' | 'desktop' }) {
  const sizeClasses = {
    mobile: 'w-48',    // 192px
    tablet: 'w-64',    // 256px  
    desktop: 'w-96'    // 384px
  }
  
  const imageSizes = {
    mobile: '192px',
    tablet: '256px',
    desktop: '384px'
  }
  
  return (
    <div className={`flex-shrink-0 ${sizeClasses[size]} relative rounded-lg overflow-hidden shadow-lg bg-white dark:bg-gray-800`}>
      {/* 16:9のアスペクト比コンテナ */}
      <div className="aspect-video relative">
        <Image
          src={work.header_image_url}
          alt="作品画像"
          fill
          className="object-cover"
          sizes={imageSizes[size]}
        />
      </div>
    </div>
  )
}