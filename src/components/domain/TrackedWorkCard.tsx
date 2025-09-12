'use client'

import { WorkCard } from './WorkCard'
import { useImpressionTracking, type ImpressionContext } from '@/lib/hooks/useImpressionTracking'
import type { Work } from '@/features/works/types'

interface TrackedWorkCardProps {
  work: Work
  isLiked?: boolean
  isBookmarked?: boolean
  hasReadingProgress?: boolean
  readingProgress?: number
  disableContinueDialog?: boolean
  trackingContext: ImpressionContext
  impressionOptions?: {
    threshold?: number
    minDuration?: number
    enabled?: boolean
  }
}

export function TrackedWorkCard({
  work,
  isLiked,
  isBookmarked,
  hasReadingProgress,
  readingProgress,
  disableContinueDialog,
  trackingContext,
  impressionOptions = {}
}: TrackedWorkCardProps) {
  const { ref, isVisible } = useImpressionTracking(
    work.work_id,
    trackingContext,
    impressionOptions
  )

  return (
    <div ref={ref} className="impression-tracked-work">
      <WorkCard
        work={work}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        hasReadingProgress={hasReadingProgress}
        readingProgress={readingProgress}
        disableContinueDialog={disableContinueDialog}
      />
    </div>
  )
}