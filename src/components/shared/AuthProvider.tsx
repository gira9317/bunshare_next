'use client'

import { createContext, useContext } from 'react'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ 
  children, 
  user 
}: { 
  children: React.ReactNode
  user: User | null 
}) {
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}