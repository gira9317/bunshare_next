import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'
import { cache } from 'react'

export const getAuthenticatedUser = async (): Promise<User | null> => {
  console.log('getAuthenticatedUser: Starting auth check...')
  const supabase = await createClient()
  
  try {
    // Use getUser for proper authentication validation
    console.log('getAuthenticatedUser: Calling getUser...')
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Handle AuthSessionMissingError as a normal case (user not logged in)
      if (error.message.includes('Auth session missing')) {
        console.log('No auth session found - user not logged in')
        return null
      }
      
      console.error('Auth user error:', error)
      
      // If token is invalid, clear session
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        console.log('Clearing invalid session')
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
        }
      }
      
      return null
    }
    
    console.log('getAuthenticatedUser: User result:', user ? { user: user.id, email: user.email } : 'No user')
    return user
  } catch (error) {
    console.error('Auth user exception:', error)
    return null
  }
}