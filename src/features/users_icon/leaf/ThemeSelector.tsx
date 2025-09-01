'use client'

import { useState } from 'react'
import { useDarkMode } from '@/lib/hooks/useDarkMode'
import { cn } from '@/lib/utils'

interface ThemeSelectorProps {
  className?: string
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme, themes, isDark, mounted } = useDarkMode()

  const currentTheme = themes.find(t => t.key === theme)

  // マウントされていない間は何も表示しない（hydration error防止）
  if (!mounted) {
    return (
      <div className={cn(
        'flex items-center gap-3 px-4 py-2.5 w-full text-left',
        'text-sm text-gray-700 dark:text-gray-200',
        className
      )}>
        <span className="text-base w-5 text-center">💻</span>
        <span className="font-medium flex-1">テーマ</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 w-full text-left',
          'text-sm text-gray-700 dark:text-gray-200',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'transition-colors duration-150'
        )}
      >
        <span className="text-base w-5 text-center">
          {isDark ? '🌙' : '☀️'}
        </span>
        <span className="font-medium flex-1">テーマ</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {currentTheme?.label}
        </span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          className={cn(
            'text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        >
          <path 
            d="m6 9 6 6 6-6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div className="ml-4 border-l border-gray-200 dark:border-gray-700">
          {themes.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => {
                console.log('Theme button clicked:', key)
                setTheme(key as any)
                setIsOpen(false)
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-2 w-full text-left',
                'text-sm text-gray-600 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-800',
                'transition-colors duration-150',
                theme === key && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              )}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              <span className="font-medium">{label}</span>
              {theme === key && (
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="text-blue-600 dark:text-blue-400 ml-auto"
                >
                  <path 
                    d="M20 6 9 17l-5-5" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}