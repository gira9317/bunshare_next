'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { UserIconDropdownSection } from '@/features/users_icon'
import { NotificationPanelSection } from '@/features/notifications'
import type { UserProfile } from '@/features/users_icon/types'
import type { Notification } from '@/features/notifications/types'

interface TopBarProps {
  userProfile: UserProfile | null
  initialNotifications: Notification[]
  initialUnreadCount: number
  onMobileSearchOpen?: () => void
}

export function TopBar({ 
  userProfile, 
  initialNotifications, 
  initialUnreadCount,
  onMobileSearchOpen
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/app/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const handleMobileSearch = () => {
    onMobileSearchOpen?.()
  }

  return (
    <header className={cn(
      'sticky top-0 z-50',
      'bg-white dark:bg-gray-800 backdrop-blur-md',
      'border-b border-gray-200 dark:border-gray-700',
      'transition-colors duration-200'
    )}>
      <div className={cn(
        'flex items-center justify-between',
        'h-12 sm:h-14 md:h-16',
        'px-3 sm:px-4 md:px-6'
      )}>
        {/* モバイル・タブレット用ロゴ */}
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/app" className="flex items-center gap-2 group active:scale-95 transition-transform">
            <Image
              src="/images/logo/Bunshare_logo.png"
              alt="Bunshare"
              width={32}
              height={32}
              className={cn(
                'w-6 h-6 sm:w-7 sm:h-7 object-contain logo-light',
                'group-hover:scale-105 transition-all duration-200'
              )}
            />
            <Image
              src="/images/logo/Bunshare_logo_dark_mode.png"
              alt="Bunshare"
              width={32}
              height={32}
              className={cn(
                'w-6 h-6 sm:w-7 sm:h-7 object-contain logo-dark',
                'group-hover:scale-105 transition-all duration-200'
              )}
            />
            <span className={cn(
              'text-base sm:text-lg font-bold',
              'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
              'group-hover:from-purple-700 group-hover:to-blue-700 transition-colors'
            )}>
              Bunshare
            </span>
          </Link>
        </div>

        {/* デスクトップ用検索バー */}
        <div className="hidden md:flex flex-1 max-w-xl lg:max-w-2xl mx-4 lg:mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className={cn(
              'flex items-center w-full',
              'bg-gray-100/80 dark:bg-gray-700/50 rounded-full',
              'border border-gray-200/50 dark:border-gray-600/50',
              'hover:border-purple-300 dark:hover:border-purple-600',
              'focus-within:border-purple-400 dark:focus-within:border-purple-500',
              'focus-within:ring-2 focus-within:ring-purple-400/20',
              'transition-all duration-200'
            )}>
              <div className="pl-3 lg:pl-4 pr-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-500 dark:text-gray-400 lg:w-5 lg:h-5">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="作品や作者を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'flex-1 py-2 lg:py-2.5 px-2 bg-transparent',
                  'text-sm lg:text-base text-gray-900 dark:text-gray-100',
                  'placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none font-medium'
                )}
              />
              <button
                type="submit"
                className={cn(
                  'mx-2 px-3 lg:px-4 py-1 lg:py-1.5 rounded-full',
                  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                  'hover:from-purple-700 hover:to-blue-700',
                  'font-medium text-xs lg:text-sm transition-all',
                  'hover:scale-105 active:scale-95'
                )}
              >
                検索
              </button>
            </div>
          </form>
        </div>


        {/* ユーザーアクション */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
          {/* モバイル検索ボタン */}
          <button
            onClick={handleMobileSearch}
            className={cn(
              'p-1.5 sm:p-2 rounded-lg md:hidden',
              'bg-gray-100/80 dark:bg-gray-800/80',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'active:scale-95 transition-all duration-200'
            )}
            title="検索"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-300 sm:w-4 sm:h-4">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>

          {/* 通知パネル */}
          {userProfile && (
            <NotificationPanelSection
              userId={userProfile.id}
              initialNotifications={initialNotifications}
              initialUnreadCount={initialUnreadCount}
            />
          )}

          {/* ユーザーアイコン */}
          <UserIconDropdownSection
            user={userProfile}
            size="md"
          />
        </div>
      </div>
    </header>
  )
}