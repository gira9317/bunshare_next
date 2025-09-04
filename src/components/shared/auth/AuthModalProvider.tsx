'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthModalContextType {
  isOpen: boolean
  mode: 'login' | 'signup'
  openLogin: () => void
  openSignup: () => void
  close: () => void
  returnUrl?: string
  setReturnUrl: (url: string | undefined) => void
}

const AuthModalContext = createContext<AuthModalContextType | null>(null)

interface AuthModalProviderProps {
  children: ReactNode
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [returnUrl, setReturnUrl] = useState<string | undefined>()

  const openLogin = () => {
    setMode('login')
    setIsOpen(true)
  }

  const openSignup = () => {
    setMode('signup')
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setReturnUrl(undefined)
  }

  const value: AuthModalContextType = {
    isOpen,
    mode,
    openLogin,
    openSignup,
    close,
    returnUrl,
    setReturnUrl
  }

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModalContext() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModalContext must be used within AuthModalProvider')
  }
  return context
}