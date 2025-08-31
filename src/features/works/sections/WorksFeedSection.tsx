import { WorkCard } from '../leaf/WorkCard'
import type { Work } from '../types'

interface WorksFeedSectionProps {
  works: Work[]
  userLikes?: string[]
  userBookmarks?: string[]
  title?: string
}

export function WorksFeedSection({ 
  works, 
  userLikes = [], 
  userBookmarks = [],
  title = 'あなたへのおすすめ'
}: WorksFeedSectionProps) {
  if (works.length === 0) {
    return (
      <section className="py-8">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="text-center py-12 text-gray-500">
          <p>まだ作品がありません</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {works.map((work) => (
          <WorkCard
            key={work.work_id}
            work={work}
            isLiked={userLikes.includes(work.work_id)}
            isBookmarked={userBookmarks.includes(work.work_id)}
          />
        ))}
      </div>
    </section>
  )
}