import { WorkCard } from '@/components/domain/WorkCard'
import type { Work } from '@/features/works/types'

interface ContinueReadingSectionProps {
  works: Work[]
  userLikes?: string[]
  userBookmarks?: string[]
}

export function ContinueReadingSection({ works, userLikes = [], userBookmarks = [] }: ContinueReadingSectionProps) {
  
  if (works.length === 0) {
    return null
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <span>📖</span>
        <span>続きを読む</span>
      </h2>
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-5 xl:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {works.map((work) => {
          
          return (
            <WorkCard
              key={work.work_id}
              work={work}
              isLiked={userLikes.includes(work.work_id)}
              isBookmarked={userBookmarks.includes(work.work_id)}
              hasReadingProgress={true}
              readingProgress={work.readingProgress || 0}
              disableContinueDialog={false}
            />
          )
        })}
      </div>
    </section>
  )
}