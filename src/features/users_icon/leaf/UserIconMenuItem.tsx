'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface UserIconMenuItemProps {
  label?: string
  icon?: string | ReactNode
  href?: string
  onClick?: () => void
  onItemClick?: (href?: string) => void
  divider?: boolean
  className?: string
}

export function UserIconMenuItem({
  label,
  icon,
  href,
  onClick,
  onItemClick,
  divider,
  className
}: UserIconMenuItemProps) {
  if (divider) {
    return (
      <div className="h-px bg-gray-200 my-1" />
    )
  }
  
  const itemClass = cn(
    'flex items-center gap-3 px-4 py-2.5',
    'text-sm text-gray-700',
    'hover:bg-gray-50',
    'transition-colors duration-150',
    'cursor-pointer',
    className
  )
  
  const content = (
    <>
      <span className="w-5 h-5 flex items-center justify-center">
        {typeof icon === 'string' ? (
          <span className="text-base">{icon}</span>
        ) : (
          icon
        )}
      </span>
      <span className="font-medium">{label}</span>
    </>
  )
  
  const handleClick = () => {
    if (onClick) {
      onClick()
    }
    if (onItemClick) {
      onItemClick(href)
    }
  }
  
  if (href) {
    return (
      <Link 
        href={href} 
        className={itemClass}
        onClick={handleClick}
        prefetch={true}
      >
        {content}
      </Link>
    )
  }
  
  return (
    <button
      onClick={handleClick}
      className={cn(itemClass, 'w-full text-left')}
    >
      {content}
    </button>
  )
}