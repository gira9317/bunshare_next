'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserProfile } from '../types'

export function useUserIcon(initialUser: UserProfile | null) {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(initialUser)
  
  const open = useCallback(() => {
    setIsOpen(true)
  }, [])
  
  const close = useCallback(() => {
    setIsOpen(false)
  }, [])
  
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, close])
  
  return {
    user,
    isOpen,
    open,
    close,
    toggle,
    setUser
  }
}