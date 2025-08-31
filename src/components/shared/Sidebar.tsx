'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/post', label: '投稿', icon: '✍️' },
  { href: '/profile', label: 'プロフィール', icon: '👤' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 w-[280px] h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col z-50">
      {/* ロゴ */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            B
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Bunshare
          </span>
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors',
              pathname === item.href
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            )}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 投稿ボタン */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/post"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <span>✨</span>
          <span>作品を投稿</span>
        </Link>
      </div>
    </aside>
  )
}