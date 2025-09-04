'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const supabase = await createClient()
  
  console.log('Signing out user...')
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error)
    throw new Error('ログアウトに失敗しました')
  }
  
  console.log('Logout successful, clearing cache...')
  
  // キャッシュを完全にクリア
  revalidatePath('/', 'layout')
  revalidatePath('/')
  
  redirect('/')
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