'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-[280px] h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40">
      <div className="flex items-center justify-between h-full px-4">
        {/* モバイルロゴ */}
        <div className="lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Bunshare
            </span>
          </Link>
        </div>

        {/* 検索バー（デスクトップ） */}
        <form onSubmit={handleSearch} className="hidden lg:block flex-1 max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="作品や作者を検索..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </form>

        {/* 右側のアクション */}
        <div className="flex items-center gap-3">
          {/* ダークモード切り替え */}
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* モバイル検索 */}
          <button className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            🔍
          </button>

          {/* 通知 */}
          <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            🔔
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* ユーザーアバター */}
          <button className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            U
          </button>
        </div>
      </div>
    </header>
  )
}