'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { 
    href: '/', 
    label: 'ホーム', 
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="nav-icon-svg">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
        <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/post', 
    label: '投稿', 
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="nav-icon-svg">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  },
  { 
    href: '/profile', 
    label: 'プロフィール', 
    iconSvg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="nav-icon-svg">
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
      'hidden lg:flex fixed left-0 top-0 w-[280px] h-screen flex-col z-[1000]',
      'bg-white/95 dark:bg-gray-800/95 backdrop-blur-[20px]',
      'border-r border-gray-200 dark:border-gray-700',
      'transition-all duration-300 ease-out'
    )}>
      {/* ロゴヘッダー */}
      <div className="px-6 py-8 border-b border-gray-200 dark:border-gray-700">
        <Link 
          href="/" 
          className="flex items-center gap-4 group"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {/* ロゴアイコン */}
          <div className="relative w-12 h-12">
            {/* ライトモード用ロゴ */}
            <Image
              src="/images/logo/Bunshare_logo.png"
              alt="Bunshare"
              width={48}
              height={48}
              className={cn(
                'w-12 h-12 object-contain transition-all duration-300',
                'group-hover:scale-105 drop-shadow-lg group-hover:drop-shadow-xl',
                'dark:hidden'
              )}
            />
            {/* ダークモード用ロゴ */}
            <Image
              src="/images/logo/Bunshare_logo_dark_mode.png"
              alt="Bunshare"
              width={48}
              height={48}
              className={cn(
                'w-12 h-12 object-contain transition-all duration-300',
                'group-hover:scale-105 drop-shadow-lg group-hover:drop-shadow-xl',
                'hidden dark:block'
              )}
            />
          </div>
          
          {/* ブランドテキスト */}
          <span className={cn(
            'text-xl font-bold transition-all duration-300',
            'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
            'group-hover:from-purple-700 group-hover:to-blue-700'
          )}>
            Bunshare
          </span>
        </Link>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-4 px-5 py-3.5 mx-1 mb-1 rounded-xl',
              'text-sm font-medium transition-all duration-300 ease-out',
              'relative group',
              pathname === item.href
                ? cn(
                    'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                    'shadow-lg shadow-purple-500/25',
                    'font-semibold'
                  )
                : cn(
                    'text-gray-600 dark:text-gray-400',
                    'hover:bg-gray-100/80 dark:hover:bg-gray-700/50',
                    'hover:text-gray-900 dark:hover:text-gray-100',
                    'hover:translate-x-1'
                  )
            )}
          >
            <span className={cn(
              'nav-icon transition-all duration-300 flex items-center',
              pathname === item.href && 'drop-shadow-sm'
            )}>
              {item.iconSvg}
            </span>
            <span className="nav-text">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 投稿ボタン */}
      <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/post"
          className={cn(
            'flex items-center justify-center gap-2 w-full py-4 px-6',
            'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
            'rounded-2xl font-semibold text-base',
            'shadow-lg shadow-purple-500/30',
            'hover:shadow-xl hover:shadow-purple-500/40',
            'hover:scale-[1.02] active:scale-[0.98]',
            'transition-all duration-300 ease-out',
            'relative overflow-hidden group'
          )}
        >
          {/* ホバー時の光沢効果 */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0',
            'translate-x-[-100%] group-hover:translate-x-[100%]',
            'transition-transform duration-700 ease-out'
          )} />
          
          <span className="relative z-10 text-xl">✨</span>
          <span className="relative z-10">作品を投稿</span>
        </Link>
      </div>
    </aside>
  )
}