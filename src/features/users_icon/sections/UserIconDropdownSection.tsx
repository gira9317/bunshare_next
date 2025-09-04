'use client'

import { UserIconAvatar } from '../leaf/UserIconAvatar'
import { UserIconMenu } from '../leaf/UserIconMenu'
import { useUserIcon } from '../hooks/useUserIcon'
import { useAuthModal } from '@/components/shared/auth/useAuthModal'
import { UserProfile } from '../types'
import { cn } from '@/lib/utils'

interface UserIconDropdownSectionProps {
  user: UserProfile | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserIconDropdownSection({ 
  user,
  size = 'md',
  className 
}: UserIconDropdownSectionProps) {
  const { isOpen, toggle, close, dropdownRef } = useUserIcon(user)
  const { openLogin } = useAuthModal()
  
  if (!user) {
    return (
      <button
        onClick={openLogin}
        className={cn(
          'px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg',
          'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
          'hover:from-purple-700 hover:to-blue-700',
          'font-medium text-sm transition-all',
          'hover:scale-105 active:scale-95',
          className
        )}
      >
        ログイン
      </button>
    )
  }
  
  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <UserIconAvatar
        user={user}
        size={size}
        onClick={toggle}
      />
      <UserIconMenu
        user={user}
        isOpen={isOpen}
        onClose={close}
      />
    </div>
  )
}