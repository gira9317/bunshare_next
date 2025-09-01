import Link from 'next/link'
import { cn } from '@/lib/utils'
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
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {works.map((work) => (
          <Link
            key={work.id}
            href={`/works/${work.id}?bookmark=true`}
            className={cn(
              'flex-shrink-0 w-64 p-4 rounded-lg border',
              'bg-gradient-to-r from-yellow-50 to-orange-50',
              'dark:from-yellow-900/20 dark:to-orange-900/20',
              'border-orange-200 dark:border-orange-800',
              'hover:shadow-md transition-all'
            )}
          >
            <h3 className="font-semibold text-sm mb-1 line-clamp-1 text-gray-900 dark:text-gray-100">
              {work.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              by {work.author}
            </p>
            <div className="flex items-center justify-between">
              <button className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600">
                しおりから始める
              </button>
              {work.readingProgress && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {work.readingProgress}%
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}