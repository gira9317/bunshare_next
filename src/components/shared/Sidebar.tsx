'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { 
    href: '/app', 
    label: 'ホーム',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
        <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/trends', 
    label: 'トレンド',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2"/>
        <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/works/create', 
    label: '投稿',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/profile', 
    label: 'プロフィール',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className={cn(
      'hidden md:flex fixed left-0 top-0 h-screen flex-col z-40',
      'w-56 lg:w-64 xl:w-72',
      'bg-white dark:bg-gray-800 backdrop-blur-md',
      'border-r border-gray-200 dark:border-gray-700',
      'transition-colors duration-200'
    )}>
      {/* ロゴヘッダー */}
      <div className={cn(
        'px-4 lg:px-6 py-4 lg:py-6',
        'border-b border-gray-200 dark:border-gray-700'
      )}>
        <Link href="/app" className="flex items-center gap-2 lg:gap-3 group">
          <Image
            src="/images/logo/Bunshare_logo.png"
            alt="Bunshare"
            width={48}
            height={48}
            className={cn(
              'w-8 h-8 lg:w-10 lg:h-10 object-contain logo-light',
              'group-hover:scale-105 transition-all duration-200'
            )}
          />
          <Image
            src="/images/logo/Bunshare_logo_dark_mode.png"
            alt="Bunshare"
            width={48}
            height={48}
            className={cn(
              'w-8 h-8 lg:w-10 lg:h-10 object-contain logo-dark',
              'group-hover:scale-105 transition-all duration-200'
            )}
          />
          <span className={cn(
            'text-lg lg:text-xl font-bold',
            'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
            'group-hover:from-purple-700 group-hover:to-blue-700 transition-colors duration-200'
          )}>
            Bunshare
          </span>
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className={cn(
        'flex-1 px-3 lg:px-4 py-4 lg:py-6',
        'overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600'
      )}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 lg:gap-3',
                'px-2 lg:px-3 py-2 lg:py-2.5 rounded-lg mb-1',
                'transition-all duration-200',
                'group relative',
                isActive
                  ? cn(
                      'bg-purple-100 dark:bg-purple-900/30',
                      'text-purple-600 dark:text-purple-400 font-medium',
                      'shadow-sm'
                    )
                  : cn(
                      'text-gray-600 dark:text-gray-400',
                      'hover:bg-gray-100/80 dark:hover:bg-gray-700/50',
                      'hover:text-gray-900 dark:hover:text-gray-100',
                      'hover:translate-x-0.5'
                    )
              )}
            >
              <span className={cn(
                'w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0',
                'transition-transform duration-200',
                isActive && 'scale-110'
              )}>
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
                  {item.icon.props.children}
                </svg>
              </span>
              <span className={cn(
                'text-sm lg:text-base truncate',
                'transition-colors duration-200'
              )}>
                {item.label}
              </span>
              
              {/* アクティブインジケーター */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-600 rounded-r-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* 投稿ボタン */}
      <div className={cn(
        'px-4 lg:px-6 py-3 lg:py-4',
        'border-t border-gray-200/50 dark:border-gray-700/50'
      )}>
        <Link
          href="/app/works/create"
          className={cn(
            'flex items-center justify-center gap-2 w-full',
            'py-2.5 lg:py-3 px-3 lg:px-4 rounded-lg lg:rounded-xl',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'hover:from-purple-700 hover:to-blue-700',
            'font-semibold text-sm lg:text-base',
            'shadow-md hover:shadow-lg',
            'transition-all duration-200',
            'hover:scale-[1.02] active:scale-[0.98]',
            'relative overflow-hidden group'
          )}
        >
          {/* ホバー時の光沢効果 */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0',
            'translate-x-[-100%] group-hover:translate-x-[100%]',
            'transition-transform duration-500 ease-out'
          )} />
          
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-10 lg:w-5 lg:h-5">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="relative z-10">作品を投稿</span>
        </Link>
      </div>
    </aside>
  )
}