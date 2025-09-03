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
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('認証が必要です')
    }

    const file = formData.get('avatar') as File
    if (!file) {
      throw new Error('ファイルが選択されていません')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('画像ファイルを選択してください')
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('ファイルサイズは5MB以下にしてください')
    }

    const fileName = `${user.id}_avatar_${Date.now()}.webp`
    const uploadPath = `avatars/${fileName}`

    // Upload with retry logic
    let uploadAttempts = 0
    let uploadData, uploadError
    
    while (uploadAttempts < 3) {
      const result = await supabase.storage
        .from('user-assets')
        .upload(uploadPath, file, {
          upsert: true,
          contentType: 'image/webp'
        })
      
      uploadData = result.data
      uploadError = result.error
      
      if (!uploadError) break
      
      uploadAttempts++
      if (uploadAttempts < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
      }
    }

    if (uploadError || !uploadData) {
      throw new Error(`アバター画像のアップロードに失敗しました: ${uploadError?.message || '不明なエラー'}`)
    }

    const { data: publicUrl } = supabase.storage
      .from('user-assets')
      .getPublicUrl(uploadData.path)

    if (!publicUrl.publicUrl) {
      throw new Error('画像URLの生成に失敗しました')
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_img_url: publicUrl.publicUrl
      })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`)
    }

    // Clear cache
    revalidateTag(`user-${user.id}`)
    revalidatePath('/profile')

    return { success: true, url: publicUrl.publicUrl }
  } catch (error: any) {
    console.error('Upload avatar error:', error)
    throw error
  }
}

export async function uploadCover(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('認証が必要です')
    }

    const file = formData.get('cover') as File
    if (!file) {
      throw new Error('ファイルが選択されていません')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('画像ファイルを選択してください')
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('ファイルサイズは5MB以下にしてください')
    }

    const fileName = `${user.id}_cover_${Date.now()}.webp`
    const uploadPath = `headers/${fileName}`

    // Upload with retry logic
    let uploadAttempts = 0
    let uploadData, uploadError
    
    while (uploadAttempts < 3) {
      const result = await supabase.storage
        .from('user-assets')
        .upload(uploadPath, file, {
          upsert: true,
          contentType: 'image/webp'
        })
      
      uploadData = result.data
      uploadError = result.error
      
      if (!uploadError) break
      
      uploadAttempts++
      if (uploadAttempts < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
      }
    }

    if (uploadError || !uploadData) {
      throw new Error(`カバー画像のアップロードに失敗しました: ${uploadError?.message || '不明なエラー'}`)
    }

    const { data: publicUrl } = supabase.storage
      .from('user-assets')
      .getPublicUrl(uploadData.path)

    if (!publicUrl.publicUrl) {
      throw new Error('画像URLの生成に失敗しました')
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        header_img_url: publicUrl.publicUrl
      })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`)
    }

    // Clear cache
    revalidateTag(`user-${user.id}`)
    revalidatePath('/profile')

    return { success: true, url: publicUrl.publicUrl }
  } catch (error: any) {
    console.error('Upload cover error:', error)
    throw error
  }
}