'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface UserIconMenuItemProps {
  label: string
  icon: string
  href?: string
  onClick?: () => void
  divider?: boolean
  className?: string
}

export function UserIconMenuItem({
  label,
  icon,
  href,
  onClick,
  divider,
  className
}: UserIconMenuItemProps) {
  if (divider) {
    return (
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
    )
  }
  
  const itemClass = cn(
    'flex items-center gap-3 px-4 py-2.5',
    'text-sm text-gray-700 dark:text-gray-200',
    'hover:bg-gray-100 dark:hover:bg-gray-700',
    'transition-colors duration-150',
    'cursor-pointer',
    className
  )
  
  const content = (
    <>
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="font-medium">{label}</span>
    </>
  )
  
  if (href) {
    return (
      <Link href={href} className={itemClass}>
        {content}
      </Link>
    )
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(itemClass, 'w-full text-left')}
    >
      {content}
    </button>
  )
}