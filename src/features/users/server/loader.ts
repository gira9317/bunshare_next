import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { UserProfile, UserStats, UserWithStats, UserWork, FollowRelation, Series } from '../schemas'
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

  // 統計データを高速化（exactカウントを避け、推定値を使用）
  const [
    { count: followersCount },
    { count: followingCount },
    { count: worksCount },
    { count: likesCount },
    { count: bookmarksCount }
  ] = await Promise.all([
    // estimated countで高速化
    supabase.from('follows').select('*', { count: 'estimated', head: true }).eq('followed_id', userId).eq('status', 'approved'),
    supabase.from('follows').select('*', { count: 'estimated', head: true }).eq('follower_id', userId).eq('status', 'approved'),
    supabase.from('works').select('*', { count: 'estimated', head: true }).eq('user_id', userId).eq('is_published', true),
    supabase.from('likes').select('*', { count: 'estimated', head: true }).eq('user_id', userId),
    supabase.from('reading_bookmarks').select('*', { count: 'estimated', head: true }).eq('user_id', userId)
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
      category,
      is_published,
      is_private,
      created_at,
      updated_at,
      likes_count,
      comments_count,
      views_count,
      trend_score,
      recent_views_24h,
      recent_views_7d
    `)
    .eq('user_id', userId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data) {
    return []
  }

  return data.map((work: any) => ({
    ...work,
    likes_count: work.likes_count || 0,
    comments_count: work.comments_count || 0,
    views_count: work.views_count || 0
  }))
})

export const getFollowRelation = cache(async (followerId: string, followingId: string): Promise<FollowRelation | null> => {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('followed_id', followingId)
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
      episode_number,
      is_adult_content,
      created_at,
      updated_at,
      views,
      likes,
      comments,
      rating,
      trend_score,
      recent_views_24h,
      recent_views_7d
    `)
    .eq('user_id', userId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching user published works:', error)
    return []
  }

  // 作者情報を別途取得
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()

  const author = user?.username || 'Unknown'

  return (data || []).map(work => ({
    ...work,
    author,
    author_username: user?.username
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
      episode_number,
      is_adult_content,
      created_at,
      updated_at,
      views,
      likes,
      comments,
      rating
    `)
    .eq('user_id', userId)
    .eq('is_published', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching user draft works:', error)
    return []
  }

  // 作者情報を別途取得
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()

  const author = user?.username || 'Unknown'

  return (data || []).map(work => ({
    ...work,
    author,
    author_username: user?.username
  })) as Work[]
})

export const getUserLikedWorks = cache(async (userId: string): Promise<Work[]> => {
  const supabase = await createClient()
  
  // Get liked work IDs first
  const { data: likedWorkIds, error: likesError } = await supabase
    .from('likes')
    .select('work_id')
    .eq('user_id', userId)
    .order('liked_at', { ascending: false })

  if (likesError || !likedWorkIds?.length) {
    console.error('Error fetching user likes:', likesError)
    return []
  }

  // Get works details
  const workIds = likedWorkIds.map(like => like.work_id)
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
      episode_number,
      is_adult_content,
      created_at,
      updated_at,
      views,
      likes,
      comments,
      rating
    `)
    .in('work_id', workIds)
    .eq('is_published', true)

  if (error) {
    console.error('Error fetching liked works details:', error)
    return []
  }

  // 作者情報を別途取得
  const userIds = [...new Set(data?.map(work => work.user_id).filter(Boolean))] || []
  let userMap: { [key: string]: any } = {}
  
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds)
    
    if (!usersError && users) {
      userMap = users.reduce((acc, user) => {
        acc[user.id] = user
        return acc
      }, {} as { [key: string]: any })
    }
  }

  return (data || []).map(work => ({
    ...work,
    author: userMap[work.user_id]?.username || '不明',
    author_username: userMap[work.user_id]?.username
  })) as Work[]
})

export const getUserBookmarkedWorks = cache(async (userId: string): Promise<Work[]> => {
  const supabase = await createClient()
  
  // Use bookmarks table
  const { data: bookmarkedWorkIds, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('work_id, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('bookmarked_at', { ascending: false })  // sort_orderが同じ場合のfallback

  if (bookmarksError || !bookmarkedWorkIds?.length) {
    console.error('Error fetching user bookmarks:', bookmarksError)
    return []
  }

  // Get works details
  const workIds = bookmarkedWorkIds.map(bookmark => bookmark.work_id)
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
      episode_number,
      is_adult_content,
      created_at,
      updated_at,
      views,
      likes,
      comments,
      rating
    `)
    .in('work_id', workIds)
    .eq('is_published', true)

  if (error) {
    console.error('Error fetching bookmarked works details:', error)
    return []
  }

  // 作者情報を別途取得
  const userIds = [...new Set(data?.map(work => work.user_id).filter(Boolean))] || []
  let userMap: { [key: string]: any } = {}
  
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds)
    
    if (!usersError && users) {
      userMap = users.reduce((acc, user) => {
        acc[user.id] = user
        return acc
      }, {} as { [key: string]: any })
    }
  }

  return (data || []).map(work => ({
    ...work,
    author: userMap[work.user_id]?.username || '不明',
    author_username: userMap[work.user_id]?.username
  })) as Work[]
})