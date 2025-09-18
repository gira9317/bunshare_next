'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

interface UserBioProps {
  bio?: string | null
  className?: string
  maxLength?: number
  collapsible?: boolean
}

export function UserBio({ 
  bio, 
  className,
  maxLength = 160,
  collapsible = true 
}: UserBioProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!bio) {
    return null
  }

  const shouldCollapse = collapsible && bio.length > maxLength
  const displayText = shouldCollapse && !isExpanded 
    ? bio.slice(0, maxLength) + '...' 
    : bio

  return (
    <div className={cn('text-gray-700', className)}>
      <p className="leading-relaxed whitespace-pre-wrap">
        {displayText}
      </p>
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hovertext-blue-300 text-sm mt-1 font-medium transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}