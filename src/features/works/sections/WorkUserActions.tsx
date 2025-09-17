import { Work } from '../types'
import { WorkDetailActionsSection } from './WorkDetailActionsSection'
import { getUserWorkInteractions } from '../server/loader'
import { ProgressiveWrapper } from '@/components/shared/ProgressiveWrapper'

interface WorkUserActionsProps {
  work: Work
  userId?: string
}

/**
 * ユーザー操作コンポーネント - 段階的読み込み
 * ユーザー依存データを含む、Suspenseで包んで遅延読み込み
 */
export async function WorkUserActions({ work, userId }: WorkUserActionsProps) {
  // ユーザー相互作用を取得
  const userInteractions = userId 
    ? await getUserWorkInteractions(userId, work.work_id)
    : { isLiked: false, isBookmarked: false, readingProgress: 0 }

  const { isLiked, isBookmarked } = userInteractions

  return (
    <ProgressiveWrapper
      config={{
        delayMs: 1500, // 1.5秒後に有効化
        enableOnVisible: true, // ビューポートに入ったら即座に有効化
        enableOnInteraction: true // ユーザー操作で即座に有効化
      }}
      fallback={
        <div className="flex gap-4 p-4">
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      }
    >
      <WorkDetailActionsSection
        work={work}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
      />
    </ProgressiveWrapper>
  )
}