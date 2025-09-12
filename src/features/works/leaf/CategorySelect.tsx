'use client'

import { cn } from '@/lib/utils'

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
}

const categories = [
  { value: '小説', label: '小説' },
  { value: '詩', label: '詩' },
  { value: 'エッセイ', label: 'エッセイ' },
  { value: '日記', label: '日記' },
  { value: 'ラノベ', label: 'ラノベ' },
  { value: 'ノンフィクション', label: 'ノンフィクション' },
]

export function CategorySelect({ value, onChange, required = false }: CategorySelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        カテゴリ {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {categories.map((category) => (
          <button
            key={category.value}
            type="button"
            onClick={() => onChange(category.value)}
            className={cn(
              "flex items-center justify-center px-4 py-2 rounded-lg border transition-all",
              "hover:scale-105 active:scale-95",
              value === category.value
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400"
            )}
          >
            <span className="text-sm font-medium">{category.label}</span>
          </button>
        ))}
      </div>
      
      {/* 隠し入力フィールド（フォームデータ収集用） */}
      <input type="hidden" name="category" value={value} />
      
      {required && !value && (
        <p className="text-xs text-red-500">カテゴリを選択してください</p>
      )}
    </div>
  )
}