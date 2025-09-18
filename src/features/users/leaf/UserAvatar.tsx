'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
// import { User } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16',
  xl: 'w-32 h-32'
}

export function UserAvatar({ 
  src, 
  alt = 'User avatar', 
  size = 'md', 
  className,
  onClick 
}: UserAvatarProps) {
  return (
    <div 
      className={cn(
        'relative rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all',
        className
      )}
      onClick={onClick}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={size === 'xl' ? '128px' : size === 'lg' ? '64px' : size === 'md' ? '48px' : '32px'}
        />
      ) : (
        <svg 
          className={cn(
            'text-gray-400',
            size === 'xl' ? 'w-16 h-16' : 
            size === 'lg' ? 'w-8 h-8' : 
            size === 'md' ? 'w-6 h-6' : 'w-4 h-4'
          )}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )}
    </div>
  )
}