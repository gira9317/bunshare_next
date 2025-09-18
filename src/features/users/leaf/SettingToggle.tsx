'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SettingToggleProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function SettingToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className
}: SettingToggleProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    if (disabled || isLoading) return
    
    setIsLoading(true)
    try {
      await onChange(!checked)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      'flex items-center justify-between py-3',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <div className="flex-1">
        <label 
          htmlFor={id}
          className={cn(
            'text-sm font-medium text-gray-900 cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">
            {description}
          </p>
        )}
      </div>
      
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || isLoading}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focusring-offset-gray-800',
          checked ? 'bg-blue-600' : 'bg-gray-200',
          (disabled || isLoading) && 'cursor-not-allowed opacity-50'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-6' : 'translate-x-1',
            isLoading && 'animate-pulse'
          )}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
          </div>
        )}
      </button>
    </div>
  )
}