'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTapFeedback } from '@/hooks/useTapFeedback'
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
  const router = useRouter()

  // タップフィードバック
  const logoTapFeedback = useTapFeedback({ scaleAmount: 0.97 })
  const searchButtonTapFeedback = useTapFeedback({ scaleAmount: 0.95 })
  const mobileSearchButtonTapFeedback = useTapFeedback({ scaleAmount: 0.95 })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/app/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleMobileSearch = () => {
    onMobileSearchOpen?.()
  }

  return (
    <header className={cn(
      'sticky top-0 z-50',
      'backdrop-blur-md',
      'transition-colors duration-200'
    )}
    style={{
      backgroundColor: 'var(--bg-primary)',
      borderBottomColor: 'var(--border-primary)',
      borderBottomWidth: '1px'
    }}>
      <div className={cn(
        'flex items-center justify-between',
        'h-12 sm:h-14 md:h-16',
        'px-3 sm:px-4 md:px-6'
      )}>
        {/* モバイル・タブレット用ロゴ */}
        <div className="flex items-center gap-2 md:hidden">
          <Link 
            href="/app" 
            {...logoTapFeedback.tapProps}
            className="flex items-center gap-2 group transition-transform"
          >
            <Image
              src="/images/logo/Bunshare_logo.png"
              alt="Bunshare"
              width={32}
              height={32}
              className={cn(
                'w-6 h-6 sm:w-7 sm:h-7 object-contain logo-light',
                'group-hover:scale-105 transition-all duration-200'
              )}
              style={{
                filter: 'var(--logo-filter, none)'
              }}
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
              'flex items-center w-full rounded-full',
              'hover:border-purple-300',
              'focus-within:border-purple-400',
              'focus-within:ring-2 focus-within:ring-purple-400/20',
              'transition-all duration-200'
            )}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-secondary)',
              borderWidth: '1px'
            }}>
              <div className="pl-3 lg:pl-4 pr-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="lg:w-5 lg:h-5" style={{ color: 'var(--text-secondary)' }}>
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
                  'text-sm lg:text-base',
                  'focus:outline-none font-medium'
                )}
                style={{
                  color: 'var(--text-primary)',
                  '::placeholder': { color: 'var(--text-secondary)' }
                }}
              />
              <button
                type="submit"
                {...searchButtonTapFeedback.tapProps}
                className={cn(
                  'mx-2 px-3 lg:px-4 py-1 lg:py-1.5 rounded-full',
                  'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
                  'hover:from-purple-700 hover:to-blue-700',
                  'font-medium text-xs lg:text-sm transition-all',
                  'hover:scale-105'
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
            {...mobileSearchButtonTapFeedback.tapProps}
            className={cn(
              'p-1.5 sm:p-2 rounded-lg md:hidden',
              'hover:opacity-80',
              'transition-all duration-200'
            )}
            style={{
              backgroundColor: 'var(--bg-tertiary)'
            }}
            title="検索"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sm:w-4 sm:h-4" style={{ color: 'var(--text-secondary)' }}>
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