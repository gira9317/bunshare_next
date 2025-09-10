'use client'

import { AuthProvider } from '@/components/shared/AuthProvider'
import { AuthModalProvider } from '@/components/shared/auth/AuthModalProvider'
import { PreloadedDataProvider } from '@/components/shared/PreloadedDataProvider'
import { LoginModal } from '@/features/auth/components/LoginModal'
import type { User } from '@supabase/supabase-js'

interface ClientProvidersProps {
  user: User | null
  children: React.ReactNode
}

export function ClientProviders({ user, children }: ClientProvidersProps) {
  return (
    <AuthProvider user={user}>
      <AuthModalProvider>
        <PreloadedDataProvider user={user}>
          {children}
          <LoginModal />
        </PreloadedDataProvider>
      </AuthModalProvider>
    </AuthProvider>
  )
}