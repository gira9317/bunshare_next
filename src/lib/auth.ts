import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'
import { cache } from 'react'

export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  console.log('getAuthenticatedUser: Starting auth check...')
  const supabase = await createClient()
  
  try {
    // Use getSession instead of getUser to reduce token refresh issues
    console.log('getAuthenticatedUser: Calling getSession...')
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Auth session error:', error)
      
      // If refresh token is invalid, sign out to clear corrupted session
      if (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_already_used')) {
        console.log('Clearing corrupted session')
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
        }
      }
      
      return null
    }
    
    console.log('getAuthenticatedUser: Session result:', session ? { user: session.user?.id, email: session.user?.email } : 'No session')
    return session?.user ?? null
  } catch (error) {
    console.error('Auth session exception:', error)
    return null
  }
})