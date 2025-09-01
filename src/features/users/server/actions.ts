'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { userProfileUpdateSchema, UserProfileUpdateInput } from '../schemas'

export async function updateUserProfile(data: UserProfileUpdateInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const validatedData = userProfileUpdateSchema.parse(data)
  
  const { error } = await supabase
    .from('users')
    .update(validatedData)
    .eq('id', user.id)

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  revalidateTag(`user-${user.id}`)
  revalidatePath('/profile')
  
  return { success: true }
}

export async function followUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  if (user.id === targetUserId) {
    throw new Error('Cannot follow yourself')
  }

  // Get target user info to check if approval is required
  const { data: targetUser, error: targetUserError } = await supabase
    .from('users')
    .select('follow_approval')
    .eq('id', targetUserId)
    .single()

  if (targetUserError || !targetUser) {
    throw new Error('User not found')
  }

  const status = targetUser.follow_approval ? 'pending' : 'approved'

  const { error } = await supabase
    .from('follows')
    .upsert({
      follower_id: user.id,
      following_id: targetUserId,
      status,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'follower_id,following_id'
    })

  if (error) {
    throw new Error(`Failed to follow user: ${error.message}`)
  }

  revalidateTag(`user-${targetUserId}`)
  revalidateTag(`user-${user.id}`)
  revalidatePath(`/profile/${targetUserId}`)
  
  return { success: true, status }
}

export async function unfollowUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)

  if (error) {
    throw new Error(`Failed to unfollow user: ${error.message}`)
  }

  revalidateTag(`user-${targetUserId}`)
  revalidateTag(`user-${user.id}`)
  revalidatePath(`/profile/${targetUserId}`)
  
  return { success: true }
}

export async function approveFollowRequest(followerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('follows')
    .update({ status: 'approved' })
    .eq('follower_id', followerId)
    .eq('following_id', user.id)
    .eq('status', 'pending')

  if (error) {
    throw new Error(`Failed to approve follow request: ${error.message}`)
  }

  revalidateTag(`user-${user.id}`)
  revalidateTag(`user-${followerId}`)
  
  return { success: true }
}

export async function rejectFollowRequest(followerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', user.id)
    .eq('status', 'pending')

  if (error) {
    throw new Error(`Failed to reject follow request: ${error.message}`)
  }

  revalidateTag(`user-${user.id}`)
  
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const file = formData.get('avatar') as File
  if (!file) {
    throw new Error('No file provided')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-avatar-${Date.now()}.${fileExt}`

  const { data, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file)

  if (uploadError) {
    throw new Error(`Failed to upload avatar: ${uploadError.message}`)
  }

  const { data: publicUrl } = supabase.storage
    .from('avatars')
    .getPublicUrl(data.path)

  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      avatar_img_url: publicUrl.publicUrl
    })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(`Failed to update avatar URL: ${updateError.message}`)
  }

  revalidateTag(`user-${user.id}`)
  revalidatePath('/profile')

  return { success: true, url: publicUrl.publicUrl }
}

export async function uploadCover(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const file = formData.get('cover') as File
  if (!file) {
    throw new Error('No file provided')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-cover-${Date.now()}.${fileExt}`

  const { data, error: uploadError } = await supabase.storage
    .from('covers')
    .upload(fileName, file)

  if (uploadError) {
    throw new Error(`Failed to upload cover: ${uploadError.message}`)
  }

  const { data: publicUrl } = supabase.storage
    .from('covers')
    .getPublicUrl(data.path)

  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      header_img_url: publicUrl.publicUrl
    })
    .eq('id', user.id)

  if (updateError) {
    throw new Error(`Failed to update cover URL: ${updateError.message}`)
  }

  revalidateTag(`user-${user.id}`)
  revalidatePath('/profile')

  return { success: true, url: publicUrl.publicUrl }
}