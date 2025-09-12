import { WorkCard } from '@/components/domain/WorkCard'
import type { Work } from '@/features/works/types'

interface WorksFeedSectionProps {
  works: Work[]
  userLikes?: string[]
  userBookmarks?: string[]
  userReadingProgress?: Record<string, number>
  title?: string
}

export function WorksFeedSection({ 
  works, 
  userLikes = [], 
  userBookmarks = [],
  userReadingProgress = {},
  title = 'あなたへのおすすめ'
}: WorksFeedSectionProps) {
  if (works.length === 0) {
    return (
      <section className="py-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>まだ作品がありません</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-5 xl:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {works.map((work) => {
          const readingProgress = userReadingProgress[work.work_id]
          return (
            <WorkCard
              key={work.work_id}
              work={work}
              isLiked={userLikes.includes(work.work_id)}
              isBookmarked={userBookmarks.includes(work.work_id)}
              hasReadingProgress={readingProgress > 0}
              readingProgress={readingProgress || 0}
              disableContinueDialog={true}
            />
          )
        })}
      </div>
    </section>
  )
}