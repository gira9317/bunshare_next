'use client'

import { LandingWork } from '@/lib/landing-works'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface FloatingWorkCardsProps {
  works: LandingWork[]
}

export function FloatingWorkCards({ works }: FloatingWorkCardsProps) {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')
  const [rowPositions, setRowPositions] = useState<number[]>([])

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      if (width < 768) {
        setScreenSize('mobile')
        // モバイル: 画面を敷き詰める
        const cardHeight = 112 * (9/16) // w-28のアスペクト比
        const minGap = 4 // 最小間隔
        const maxRows = Math.floor(height / (cardHeight + minGap))
        const actualGap = (height - (cardHeight * maxRows)) / (maxRows + 1)
        const positions = Array.from({ length: maxRows }, (_, i) => 
          actualGap + i * (cardHeight + actualGap)
        )
        setRowPositions(positions)
      } else if (width < 1024) {
        setScreenSize('tablet')
        // タブレット: 画面を敷き詰める
        const cardHeight = 160 * (9/16)
        const minGap = 8
        const maxRows = Math.floor(height / (cardHeight + minGap))
        const actualGap = (height - (cardHeight * maxRows)) / (maxRows + 1)
        const positions = Array.from({ length: maxRows }, (_, i) => 
          actualGap + i * (cardHeight + actualGap)
        )
        setRowPositions(positions)
      } else {
        setScreenSize('desktop')
        // デスクトップ: 画面を敷き詰める
        const cardHeight = 256 * (9/16)
        const minGap = 12
        const maxRows = Math.floor(height / (cardHeight + minGap))
        const actualGap = (height - (cardHeight * maxRows)) / (maxRows + 1)
        const positions = Array.from({ length: maxRows }, (_, i) => 
          actualGap + i * (cardHeight + actualGap)
        )
        setRowPositions(positions)
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  const createRows = (totalWorks: LandingWork[], rowCount: number) => {
    const baseSize = Math.floor(totalWorks.length / rowCount)
    const rows: LandingWork[][] = []
    
    for (let i = 0; i < rowCount; i++) {
      const startIndex = i * baseSize
      const endIndex = startIndex + baseSize
      rows.push(totalWorks.slice(startIndex, endIndex))
    }
    
    return rows
  }

  const maxRows = rowPositions.length
  const rowsArray = createRows(works, maxRows)
  
  // レスポンシブアニメーション設定
  const getAnimationConfig = (direction: 'left' | 'right') => {
    const duration = screenSize === 'mobile' ? 15 : screenSize === 'tablet' ? 18 : 20
    
    return {
      x: direction === 'right' ? ['-33.333%', '0%'] : ['0%', '-33.333%'],
      transition: {
        duration,
        repeat: Infinity,
        ease: 'linear',
        repeatType: 'loop' as const
      }
    }
  }

  const getCardClasses = () => {
    switch (screenSize) {
      case 'mobile':
        return 'flex-shrink-0 w-28 aspect-video relative rounded-md overflow-hidden shadow-md bg-white dark:bg-gray-800'
      case 'tablet':
        return 'flex-shrink-0 w-40 aspect-video relative rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800'
      case 'desktop':
        return 'flex-shrink-0 w-64 aspect-video relative rounded-lg overflow-hidden shadow-lg bg-white dark:bg-gray-800'
      default:
        return 'flex-shrink-0 w-28 aspect-video relative rounded-md overflow-hidden shadow-md bg-white dark:bg-gray-800'
    }
  }

  const getGapClass = () => {
    switch (screenSize) {
      case 'mobile': return 'gap-1'
      case 'tablet': return 'gap-2'
      case 'desktop': return 'gap-3'
      default: return 'gap-1'
    }
  }

  const getSizes = () => {
    switch (screenSize) {
      case 'mobile': return '112px'
      case 'tablet': return '160px'
      case 'desktop': return '256px'
      default: return '112px'
    }
  }

  if (rowPositions.length === 0) {
    return null // 初期計算中は何も表示しない
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
      {rowsArray.map((rowData, rowIndex) => {
        if (!rowData || rowData.length === 0) return null
        
        const isEvenRow = rowIndex % 2 === 0
        const animation = getAnimationConfig(isEvenRow ? 'right' : 'left')
        
        return (
          <div 
            key={`row-${rowIndex}`}
            className="absolute left-0 w-full"
            style={{ top: `${rowPositions[rowIndex]}px` }}
          >
            <motion.div 
              className={`flex ${getGapClass()} w-full whitespace-nowrap`}
              animate={animation}
              style={{ willChange: 'transform' }}
            >
              {[...rowData, ...rowData, ...rowData].map((work, index) => (
                <div key={`row${rowIndex}-${work.id}-${index}`} className={getCardClasses()}>
                  <Image
                    src={work.header_image_url}
                    alt="作品画像"
                    fill
                    className="object-cover"
                    sizes={getSizes()}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}