'use client'

import { UserIconAvatar } from '../leaf/UserIconAvatar'
import { UserIconMenu } from '../leaf/UserIconMenu'
import { useUserIcon } from '../hooks/useUserIcon'
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
  
  if (!user) {
    return (
      <UserIconAvatar 
        user={null}
        size={size}
        className={className}
      />
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