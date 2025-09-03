import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { UserProfile, UserStats, UserWithStats, UserWork, FollowRelation } from '../schemas'
import type { Work } from '@/features/works/types'

export const getUserProfile = cache(async (userId: string): Promise<UserProfile | null> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('getUserProfile error:', error)
    return null
  }


  return data
})

export const getUserStats = cache(async (userId: string): Promise<UserStats> => {
  const supabase = await createClient()

  // Try both field names to ensure compatibility
  const [
    { count: followersCount },
    { count: followingCount },
    { count: worksCount },
    { count: likesCount },
    { count: bookmarksCount }
  ] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact' }).eq('following_id', userId).eq('status', 'approved'),
    supabase.from('follows').select('*', { count: 'exact' }).eq('follower_id', userId).eq('status', 'approved'),
    supabase.from('works').select('*', { count: 'exact' }).eq('user_id', userId).eq('is_published', true),
    supabase.from('likes').select('*', { count: 'exact' }).eq('user_id', userId),
    supabase.from('bookmarks').select('*', { count: 'exact' }).eq('user_id', userId)
  ])

  return {
    followers_count: followersCount || 0,
    following_count: followingCount || 0,
    works_count: worksCount || 0,
    likes_count: likesCount || 0,
    bookmarks_count: bookmarksCount || 0,
  }
})

export const getUserWithStats = cache(async (userId: string): Promise<UserWithStats | null> => {
  const user = await getUserProfile(userId)
  if (!user) return null

  const stats = await getUserStats(userId)
  
  return {
    ...user,
    stats
  }
})

export const getUserWorks = cache(async (userId: string, limit: number = 10, offset: number = 0): Promise<UserWork[]> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      work_id,
      title,
      description,
      content,
      category,
      is_published,
      is_private,
      created_at,
      updated_at,
      likes_count,
      comments_count,
      views_count
    `)
    .eq('user_id', userId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data) {
    return []
  }

  return data
})

export const getFollowRelation = cache(async (followerId: string, followingId: string): Promise<FollowRelation | null> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()

  if (error || !data) {
    return null
  }

  return data
})

export const isFollowing = cache(async (followerId: string, followingId: string): Promise<boolean> => {
  const relation = await getFollowRelation(followerId, followingId)
  return relation?.status === 'approved'
})

export const isFollowPending = cache(async (followerId: string, followingId: string): Promise<boolean> => {
  const relation = await getFollowRelation(followerId, followingId)
  return relation?.status === 'pending'
})

export const canViewProfile = cache(async (viewerId: string | null, profileUserId: string): Promise<boolean> => {
  const user = await getUserProfile(profileUserId)
  if (!user) return false
  
  // 公開プロフィール
  if (user.public_profile) return true
  
  // 本人
  if (viewerId === profileUserId) return true
  
  // ログインしていない場合は非公開プロフィールは見れない
  if (!viewerId) return false
  
  // フォロー関係をチェック
  const isFollowingUser = await isFollowing(viewerId, profileUserId)
  return isFollowingUser
})

// 新しい作品取得関数
export const getUserPublishedWorks = cache(async (userId: string, limit: number = 12): Promise<Work[]> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      work_id,
      user_id,
      title,
      description,
      content,
      category,
      tags,
      image_url,
      series_id,
      series_title,
      episode_number,
      is_adult_content,
      created_at,
      updated_at,
      views,
      likes,
      comments,
      rating,
      users!inner(username)
    `)
    .eq('user_id', userId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching user published works:', error)
    return []
  }

  return (data || []).map(work => ({
    ...work,
    author: work.users?.username || 'Unknown',
  })) as Work[]
})

export const getUserDraftWorks = cache(async (userId: string): Promise<Work[]> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('works')
    .select(`
      work_id,
      user_id,
      title,
      description,
      content,
      category,
      tags,
      image_url,
      series_id,
      series_title,
      episode_number,
      is_adult_content,
      created_at,
      updated_at,
      views,
      likes,
      comments,
      rating,
      users!inner(username)
    `)
    .eq('user_id', userId)
    .eq('is_published', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching user draft works:', error)
    return []
  }

  return (data || []).map(work => ({
    ...work,
    author: work.users?.username || 'Unknown',
  })) as Work[]
})

export const getUserLikedWorks = cache(async (userId: string): Promise<Work[]> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('likes')
    .select(`
      works!inner(
        work_id,
        user_id,
        title,
        description,
        content,
        category,
        tags,
        image_url,
        series_id,
        series_title,
        episode_number,
        is_adult_content,
        created_at,
        updated_at,
        views,
        likes,
        comments,
        rating,
        users!inner(username)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user liked works:', error)
    return []
  }

  return (data || []).map(item => ({
    ...item.works,
    author: item.works.users?.username || 'Unknown',
  })) as Work[]
})

export const getUserBookmarkedWorks = cache(async (userId: string): Promise<Work[]> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      works!inner(
        work_id,
        user_id,
        title,
        description,
        content,
        category,
        tags,
        image_url,
        series_id,
        series_title,
        episode_number,
        is_adult_content,
        created_at,
        updated_at,
        views,
        likes,
        comments,
        rating,
        users!inner(username)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user bookmarked works:', error)
    return []
  }

  return (data || []).map(item => ({
    ...item.works,
    author: item.works.users?.username || 'Unknown',
  })) as Work[]
})