'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { UserProfile } from '../types'

interface UserIconAvatarProps {
  user: UserProfile | null
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

const sizeMap = {
  sm: 'w-7 h-7 sm:w-8 sm:h-8',
  md: 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10',
  lg: 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12',
}

export function UserIconAvatar({ 
  user, 
  size = 'md', 
  onClick,
  className 
}: UserIconAvatarProps) {
  const [imageError, setImageError] = useState(false)
  
  const handleImageError = () => {
    setImageError(true)
  }
  
  if (!user) {
    return (
      <button
        onClick={onClick}
        className={cn(
          sizeMap[size],
          'rounded-lg overflow-hidden',
          'bg-gradient-to-br from-purple-600 to-blue-600',
          'hover:shadow-md hover:scale-105 active:scale-95',
          'transition-all duration-200',
          'flex items-center justify-center',
          className
        )}
      >
        <svg 
          width="60%" 
          height="60%" 
          viewBox="0 0 24 24" 
          fill="none" 
          className="text-white"
        >
          <path 
            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
            stroke="currentColor" 
            strokeWidth="1.5"
          />
          <circle 
            cx="12" 
            cy="7" 
            r="4" 
            stroke="currentColor" 
            strokeWidth="1.5"
          />
        </svg>
      </button>
    )
  }
  
  const showDefaultIcon = !user.avatar_img_url || imageError
  
  return (
    <button
      onClick={onClick}
      className={cn(
        sizeMap[size],
        'rounded-lg overflow-hidden',
        'hover:shadow-md hover:scale-105 active:scale-95',
        'transition-all duration-200',
        'relative',
        showDefaultIcon && 'bg-gradient-to-br from-purple-600 to-blue-600',
        className
      )}
      title={user.username || user.email}
    >
      {showDefaultIcon ? (
        <div className="w-full h-full flex items-center justify-center">
          <svg 
            width="60%" 
            height="60%" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="text-white"
          >
            <path 
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
              stroke="currentColor" 
              strokeWidth="1.5"
            />
            <circle 
              cx="12" 
              cy="7" 
              r="4" 
              stroke="currentColor" 
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ) : (
        <Image
          src={user.avatar_img_url}
          alt={user.username || 'User avatar'}
          fill
          className="object-cover"
          onError={handleImageError}
          sizes={size === 'sm' ? '32px' : size === 'md' ? '40px' : '48px'}
        />
      )}
    </button>
  )
}