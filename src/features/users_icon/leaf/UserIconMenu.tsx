'use client'

import { useState } from 'react'
import { UserProfile } from '../types'
import { UserIconMenuItem } from './UserIconMenuItem'
import { ThemeSelector } from './ThemeSelector'
import { signOut } from '../server/actions'
import { cn } from '@/lib/utils'

interface UserIconMenuProps {
  user: UserProfile
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function UserIconMenu({ 
  user, 
  isOpen, 
  onClose,
  className 
}: UserIconMenuProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
  if (!isOpen) return null
  
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback to direct redirect if server action fails
      window.location.href = '/auth/login'
    }
  }
  
  return (
    <>
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      <div className={cn(
        'absolute right-0 top-full mt-2',
        'w-64 bg-white dark:bg-gray-800',
        'rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
        'z-50 overflow-hidden',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user.username || 'ユーザー'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
        
        <div className="py-1">
          {/* プロフィールセクション（展開可能） */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 w-full text-left',
                'text-sm text-gray-700 dark:text-gray-200',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors duration-150'
              )}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="font-medium flex-1">プロフィール</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                className={cn(
                  'text-gray-400 transition-transform duration-200',
                  isProfileOpen && 'rotate-180'
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
            
            {isProfileOpen && (
              <div className="ml-4 border-l border-gray-200 dark:border-gray-700">
                <UserIconMenuItem
                  label="投稿作品一覧"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  }
                  href="/profile"
                />
                <UserIconMenuItem
                  label="作品管理"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 19 7-7 3 3-7 7-3-3z"/>
                      <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                      <path d="m2 2 7.586 7.586"/>
                      <circle cx="11" cy="11" r="2"/>
                    </svg>
                  }
                  href="/profile?tab=works"
                />
                <UserIconMenuItem
                  label="ライブラリ"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m16 6 4 14"/>
                      <path d="M12 6v14"/>
                      <path d="M8 8v12"/>
                      <path d="M4 4v16"/>
                    </svg>
                  }
                  href="/profile?tab=library"
                />
                <UserIconMenuItem
                  label="設定"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  }
                  href="/profile?tab=settings"
                />
              </div>
            )}
          </div>
          
          <UserIconMenuItem divider />
          
          <ThemeSelector />
          
          <UserIconMenuItem
            label="ヘルプ"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
            href="/help"
            onItemClick={() => onClose()}
          />
          
          <UserIconMenuItem divider />
          
          <UserIconMenuItem
            label="ログアウト"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            }
            onClick={handleSignOut}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          />
        </div>
      </div>
    </>
  )
}