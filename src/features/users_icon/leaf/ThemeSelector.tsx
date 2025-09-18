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
        'text-sm text-gray-700',
        className
      )}>
        <span className="w-5 h-5 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="3" rx="2" />
            <line x1="8" x2="16" y1="21" y2="21" />
            <line x1="12" x2="12" y1="17" y2="21" />
          </svg>
        </span>
        <span className="font-medium flex-1">テーマ</span>
        <span className="text-xs text-gray-500">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 w-full text-left',
          'text-sm text-gray-700',
          'hover:bg-gray-50',
          'transition-colors duration-150'
        )}
      >
        <span className="w-5 h-5 flex items-center justify-center">
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="M4.93 4.93l1.41 1.41" />
              <path d="M17.66 17.66l1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="M6.34 17.66l-1.41 1.41" />
              <path d="M19.07 4.93l-1.41 1.41" />
            </svg>
          )}
        </span>
        <span className="font-medium flex-1">テーマ</span>
        <span className="text-xs text-gray-500">
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
        <div className="ml-4 border-l border-gray-200">
          {themes.map(({ key, label, icon }) => {
          const getIconElement = (iconKey: string) => {
            switch(iconKey) {
              case '☀️':
                return (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="M4.93 4.93l1.41 1.41" />
                    <path d="M17.66 17.66l1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="M6.34 17.66l-1.41 1.41" />
                    <path d="M19.07 4.93l-1.41 1.41" />
                  </svg>
                )
              case '🌙':
                return (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )
              case '💻':
                return (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="3" rx="2" />
                    <line x1="8" x2="16" y1="21" y2="21" />
                    <line x1="12" x2="12" y1="17" y2="21" />
                  </svg>
                )
              default:
                return <span className="text-base">{iconKey}</span>
            }
          }
          
          return (
            <button
              key={key}
              onClick={() => {
                console.log('Theme button clicked:', key)
                setTheme(key as any)
                setIsOpen(false)
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-2 w-full text-left',
                'text-sm text-gray-600',
                'hover:bg-gray-800',
                'transition-colors duration-150',
                theme === key && 'bg-blue-50 text-blue-600'
              )}
            >
              <span className="w-5 h-5 flex items-center justify-center">{getIconElement(icon)}</span>
              <span className="font-medium">{label}</span>
              {theme === key && (
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="text-blue-600 ml-auto"
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
          )
        })}
        </div>
      )}
    </div>
  )
}