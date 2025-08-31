'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

  const handleMobileSearch = () => {
    // TODO: モバイル検索モーダル実装
    console.log('Open mobile search modal')
  }

  const handleNotifications = () => {
    // TODO: 通知機能実装
    console.log('Open notifications')
  }

  return (
    <header className={cn(
      'sticky top-0 z-[100]',
      'left-0 right-0 lg:left-[280px]',
      'bg-white/95 dark:bg-gray-800/95 backdrop-blur-[20px]',
      'border-b border-gray-200 dark:border-gray-700',
      'transition-all duration-300 ease-out'
    )}>
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* モバイル用ロゴ */}
        <div className="lg:hidden flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            {/* ライトモード用ロゴ */}
            <Image
              src="/images/logo/Bunshare_logo.png"
              alt="Bunshare"
              width={32}
              height={32}
              className={cn(
                'w-8 h-8 object-contain transition-all duration-300',
                'group-hover:scale-105',
                'dark:hidden'
              )}
            />
            {/* ダークモード用ロゴ */}
            <Image
              src="/images/logo/Bunshare_logo_dark_mode.png"
              alt="Bunshare"
              width={32}
              height={32}
              className={cn(
                'w-8 h-8 object-contain transition-all duration-300',
                'group-hover:scale-105',
                'hidden dark:block'
              )}
            />
            <span className={cn(
              'text-lg font-bold transition-all duration-300',
              'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
              'group-hover:from-purple-700 group-hover:to-blue-700'
            )}>
              Bunshare
            </span>
          </Link>
        </div>

        {/* デスクトップ用検索バー */}
        <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className={cn(
              'flex items-center w-full',
              'bg-gray-100/80 dark:bg-gray-700/50 rounded-2xl',
              'border border-gray-200/50 dark:border-gray-600/50',
              'hover:border-purple-300 dark:hover:border-purple-600',
              'focus-within:border-purple-400 dark:focus-within:border-purple-500',
              'focus-within:ring-2 focus-within:ring-purple-400/20',
              'transition-all duration-300'
            )}>
              {/* 検索アイコン */}
              <div className="pl-4 pr-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500 dark:text-gray-400">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              
              {/* 検索入力フィールド */}
              <input
                type="text"
                placeholder="作品や作者を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'flex-1 py-3 px-2 bg-transparent',
                  'text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none',
                  'font-medium'
                )}
              />
              
              {/* 検索ボタン */}
              <button
                type="submit"
                className={cn(
                  'mx-2 px-6 py-2 rounded-xl',
                  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                  'hover:from-purple-700 hover:to-blue-700',
                  'font-medium text-sm transition-all duration-300',
                  'hover:scale-105 active:scale-95'
                )}
              >
                検索
              </button>
            </div>
          </form>
        </div>

        {/* ユーザーアクション */}
        <div className="flex items-center gap-3">
          {/* テーマ切り替えボタン */}
          <button
            onClick={toggleDarkMode}
            className={cn(
              'p-3 rounded-xl',
              'bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600',
              'border border-gray-200/50 dark:border-gray-600/50',
              'transition-all duration-300',
              'hover:scale-105 active:scale-95'
            )}
            title="テーマを切り替え"
          >
            {/* ライトモード時: ダークモードアイコン */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="dark:hidden text-gray-600">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {/* ダークモード時: ライトモードアイコン */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="hidden dark:block text-gray-300">
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2"/>
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>

          {/* モバイル検索ボタン */}
          <button
            onClick={handleMobileSearch}
            className={cn(
              'lg:hidden p-3 rounded-xl',
              'bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600',
              'border border-gray-200/50 dark:border-gray-600/50',
              'transition-all duration-300',
              'hover:scale-105 active:scale-95'
            )}
            title="検索"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-300">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>

          {/* 通知ボタン */}
          <button
            onClick={handleNotifications}
            className={cn(
              'p-3 rounded-xl relative',
              'bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600',
              'border border-gray-200/50 dark:border-gray-600/50',
              'transition-all duration-300',
              'hover:scale-105 active:scale-95'
            )}
            title="通知"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-300">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke="currentColor" strokeWidth="2"/>
              <path d="m13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {/* 通知バッジ */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </button>

          {/* ユーザーアバター */}
          <button className={cn(
            'w-10 h-10 rounded-xl overflow-hidden',
            'bg-gradient-to-br from-purple-600 to-blue-600',
            'hover:shadow-lg hover:scale-105 transition-all duration-300',
            'border-2 border-white/50 dark:border-gray-700/50'
          )}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}