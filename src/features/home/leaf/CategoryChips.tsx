'use client'

import { cn } from '@/lib/utils'
import { useTapFeedback } from '@/hooks/useTapFeedback'

interface CategoryChipsProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

const categories = [
  { id: 'all', label: 'すべて' },
  { id: '小説', label: '小説' },
  { id: '詩', label: '詩' },
  { id: 'エッセイ', label: 'エッセイ' },
  { id: '日記', label: '日記' },
  { id: 'ラノベ', label: 'ラノベ' },
  { id: 'ノンフィクション', label: 'ノンフィクション' },
]

export function CategoryChips({ activeCategory, onCategoryChange }: CategoryChipsProps) {
  return (
    <section className="mb-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => {
          const tapFeedback = useTapFeedback({ 
            scaleAmount: 0.95,
            duration: 100
          })
          
          return (
            <button
              key={category.id}
              {...tapFeedback.tapProps}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                'border border-gray-200',
                activeCategory === category.id
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {category.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}