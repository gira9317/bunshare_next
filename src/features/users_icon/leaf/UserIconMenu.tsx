'use client'

import { UserProfile } from '../types'
import { UserIconMenuItem } from './UserIconMenuItem'
import { ThemeSelector } from './ThemeSelector'
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
  if (!isOpen) return null
  
  const handleSignOut = () => {
    // For now, just redirect to login page
    // In a real app, you'd call a server action through a form or dedicated endpoint
    window.location.href = '/auth/login'
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
          <UserIconMenuItem
            label="プロフィール"
            icon="👤"
            href={`/users/${user.id}`}
          />
          <UserIconMenuItem
            label="マイ作品"
            icon="📚"
            href={`/users/${user.id}/works`}
          />
          <UserIconMenuItem
            label="ブックマーク"
            icon="🔖"
            href="/bookmarks"
          />
          
          <UserIconMenuItem divider />
          
          <ThemeSelector />
          
          <UserIconMenuItem
            label="設定"
            icon="⚙️"
            href="/settings"
          />
          <UserIconMenuItem
            label="ヘルプ"
            icon="❓"
            href="/help"
          />
          
          <UserIconMenuItem divider />
          
          <UserIconMenuItem
            label="ログアウト"
            icon="🚪"
            onClick={handleSignOut}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          />
        </div>
      </div>
    </>
  )
}