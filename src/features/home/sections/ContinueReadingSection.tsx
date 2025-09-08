import { WorkCard } from '@/components/domain/WorkCard'
import type { Work } from '@/features/works/types'

interface ContinueReadingSectionProps {
  works: Work[]
}

export function ContinueReadingSection({ works }: ContinueReadingSectionProps) {
  
  if (works.length === 0) {
    return null
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <span>📖</span>
        <span>続きを読む</span>
      </h2>
      <div className="max-w-sm">
        {works.map((work) => {
          
          return (
            <WorkCard
              key={work.work_id}
              work={work}
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