'use client'

import { ReactNode } from 'react'
import { useProgressiveHydration, ProgressiveHydrationConfig } from '@/hooks/useProgressiveHydration'
import { cn } from '@/lib/utils'

interface ProgressiveWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
  config?: ProgressiveHydrationConfig
}

/**
 * プログレッシブハイドレーション用ラッパー
 * 子コンポーネントを段階的に有効化
 */
export function ProgressiveWrapper({
  children,
  fallback = null,
  className,
  config = {}
}: ProgressiveWrapperProps) {
  const { isHydrated } = useProgressiveHydration(config)

  return (
    <div className={cn("progressive-wrapper", className)}>
      {isHydrated ? children : fallback}
    </div>
  )
}