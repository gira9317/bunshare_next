'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UserProfile } from '../types'

export function useUserIcon(initialUser: UserProfile | null) {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(initialUser)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
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
    
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        close()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, close])
  
  return {
    user,
    isOpen,
    open,
    close,
    toggle,
    setUser,
    dropdownRef
  }
}