import { Work } from '../types'
import { WorkContentCore } from './WorkContentCore'
import { WorkContentEnhanced } from './WorkContentEnhanced'
import { getUserWorkInteractions } from '../server/loader'
import { Suspense } from 'react'

interface SeriesWork {
  work_id: string
  title: string
  episode_number?: number
}

interface WorkContentWithProgressProps {
  work: Work
  seriesWorks: SeriesWork[]
  userId?: string
}

/**
 * コンテンツ+進捗コンポーネント - ライトウェイト優先
 * 1. 軽量コア（本文のみ）を即座表示
 * 2. 拡張機能を段階的に読み込み
 */
export async function WorkContentWithProgress({ 
  work, 
  seriesWorks, 
  userId 
}: WorkContentWithProgressProps) {
  // ユーザー相互作用を取得（読書進捗のため）
  const userInteractions = userId 
    ? await getUserWorkInteractions(userId, work.work_id)
    : { isLiked: false, isBookmarked: false, readingProgress: 0 }

  const { readingProgress } = userInteractions

  return (
    <Suspense fallback={
      <div className="space-y-6">
        <WorkContentCore work={work} />
      </div>
    }>
      <WorkContentEnhanced
        work={work}
        readingProgress={readingProgress}
        seriesWorks={seriesWorks}
        userId={userId}
      />
    </Suspense>
  )
}