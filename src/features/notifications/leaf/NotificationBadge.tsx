'use client'

import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  onClick?: () => void
  className?: string
}

export function NotificationBadge({ 
  count, 
  onClick,
  className 
}: NotificationBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-1.5 sm:p-2 rounded-lg relative',
        'bg-gray-100/80 dark:bg-gray-800/80',
        'hover:bg-gray-200 dark:hover:bg-gray-700',
        'active:scale-95 transition-all duration-200',
        className
      )}
      title="通知"
    >
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        className="text-gray-600 dark:text-gray-300 sm:w-4 sm:h-4"
      >
        <path 
          d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" 
          stroke="currentColor" 
          strokeWidth="2"
        />
        <path 
          d="m13.73 21a2 2 0 0 1-3.46 0" 
          stroke="currentColor" 
          strokeWidth="2"
        />
      </svg>
      
      {count > 0 && (
        <div className={cn(
          'absolute -top-0.5 -right-0.5',
          'min-w-[18px] h-[18px] px-1',
          'bg-red-500 text-white',
          'text-[10px] font-bold',
          'rounded-full',
          'flex items-center justify-center',
          'animate-in zoom-in-50 duration-200'
        )}>
          {count > 99 ? '99+' : count}
        </div>
      )}
    </button>
  )
}