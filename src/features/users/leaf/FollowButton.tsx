'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { followUser, unfollowUser } from '../server/actions'
// import { UserPlus, UserMinus, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  targetUserId: string
  isFollowing: boolean
  isPending?: boolean
  followApproval?: boolean
  className?: string
}

export function FollowButton({ 
  targetUserId, 
  isFollowing, 
  isPending = false,
  followApproval = false,
  className 
}: FollowButtonProps) {
  const [isOptimisticFollowing, setIsOptimisticFollowing] = useState(isFollowing)
  const [isOptimisticPending, setIsOptimisticPending] = useState(isPending)
  const [isTransitionPending, startTransition] = useTransition()

  const handleFollowAction = () => {
    startTransition(async () => {
      try {
        if (isOptimisticFollowing) {
          setIsOptimisticFollowing(false)
          setIsOptimisticPending(false)
          await unfollowUser(targetUserId)
        } else {
          const result = await followUser(targetUserId)
          if (result.status === 'approved') {
            setIsOptimisticFollowing(true)
          } else {
            setIsOptimisticPending(true)
          }
        }
      } catch (error) {
        // Reset optimistic state on error
        setIsOptimisticFollowing(isFollowing)
        setIsOptimisticPending(isPending)
        console.error('Follow action failed:', error)
      }
    })
  }

  const getButtonContent = () => {
    if (isOptimisticPending) {
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
          </svg>
        ),
        text: 'リクエスト中',
        mobileText: '申請中',
        variant: 'outline' as const,
        className: 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
      }
    }
    
    if (isOptimisticFollowing) {
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2"/>
          </svg>
        ),
        text: 'フォロー中',
        mobileText: 'フォロー中',
        variant: 'outline' as const,
        className: 'hover:border-red-300 hover:text-red-600 hover:bg-red-50'
      }
    }
    
    return {
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2"/>
          <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      text: 'フォローする',
      mobileText: 'フォロー',
      variant: 'default' as const,
      className: ''
    }
  }

  const { icon, text, mobileText, variant, className: buttonClassName } = getButtonContent()

  return (
    <Button
      variant={variant}
      onClick={handleFollowAction}
      disabled={isTransitionPending}
      className={cn(
        'transition-all duration-200 whitespace-nowrap font-medium',
        // Default Twitter-like styling
        className?.includes('rounded-full') 
          ? '' 
          : 'min-w-[80px] md:min-w-[120px]',
        buttonClassName,
        className
      )}
    >
      {!className?.includes('rounded-full') && <span className="mr-2">{icon}</span>}
      <span className="hidden sm:inline">{text}</span>
      <span className="sm:hidden">{mobileText || text}</span>
    </Button>
  )
}