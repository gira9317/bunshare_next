'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error)
    throw new Error('ログアウトに失敗しました')
  }
  
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('users')
    .update({ avatar_img_url: avatarUrl })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating avatar:', error)
    throw new Error('アバターの更新に失敗しました')
  }
  
  revalidatePath('/', 'layout')
}