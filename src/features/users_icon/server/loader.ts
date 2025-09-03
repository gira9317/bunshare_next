import { createClient } from '@/lib/supabase/server'
import { UserProfile } from '../types'
import { cache } from 'react'

export const getUserProfile = cache(async (userId: string): Promise<UserProfile | null> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data as UserProfile
})

export const getCurrentUserProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient()
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return null
    }
    
    return getUserProfile(session.user.id)
  } catch (error) {
    console.error('getCurrentUserProfile error:', error)
    return null
  }
})

export const getUserProfileByUser = cache(async (user: { id: string }): Promise<UserProfile | null> => {
  return getUserProfile(user.id)
})