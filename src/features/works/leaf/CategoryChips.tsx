'use client'

import { cn } from '@/lib/utils'

interface CategoryChipsProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

const categories = [
  { id: 'all', label: 'すべて' },
  { id: 'novel', label: '小説' },
  { id: 'poem', label: '詩' },
  { id: 'essay', label: 'エッセイ' },
  { id: 'drama', label: 'ドラマ' },
  { id: 'nonfiction', label: 'ノンフィクション' },
  { id: 'fantasy', label: 'ファンタジー' },
  { id: 'romance', label: 'ロマンス' },
  { id: 'mystery', label: 'ミステリー' },
  { id: 'sf', label: 'SF' },
]

export function CategoryChips({ activeCategory, onCategoryChange }: CategoryChipsProps) {
  return (
    <section className="mb-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              'border border-gray-200 dark:border-gray-700',
              activeCategory === category.id
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            {category.label}
          </button>
        ))}
      </div>
    </section>
  )
}