'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { 
    href: '/', 
    label: 'ホーム',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
        <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/app/trends', 
    label: 'トレンド',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2"/>
        <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/app/works/create', 
    label: '投稿',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/app/profile', 
    label: 'プロフィール',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 md:hidden',
      'bg-white/95 dark:bg-gray-800/95 backdrop-blur-md',
      'border-t border-gray-200/50 dark:border-gray-700/50',
      'shadow-lg shadow-black/5',
      // セーフエリア対応
      'pb-safe',
      // モーダル表示時は非表示
      '[body.modal-open_&]:hidden'
    )}>
      <div 
        className={cn(
          'relative flex items-center justify-around',
          'px-2 sm:px-4 py-2 sm:py-3',
          'max-w-md mx-auto sm:max-w-lg'
        )}
      >

        {navItems.map((item, index) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center',
                'gap-0.5 sm:gap-1',
                'px-2 sm:px-3 py-2 sm:py-2.5',
                'rounded-xl sm:rounded-2xl',
                'flex-1 min-w-0 max-w-20 sm:max-w-24',
                isActive
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/30'
              )}
            >
              <span className="w-5 h-5 sm:w-6 sm:h-6">
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="w-full h-full"
                >
                  {item.icon.props.children}
                </svg>
              </span>
              <span className={cn(
                'text-xs sm:text-sm font-medium truncate leading-tight',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      
      {/* ホームインジケーター用スペース（iPhone X以降） */}
      <div className="h-safe-bottom" />
    </nav>
  )
}