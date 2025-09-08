import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { Work } from '@/features/works/types'

export const getSeriesWorks = cache(async (seriesId: string): Promise<Work[]> => {
  const supabase = await createClient()
  
  // シリーズに属する作品を取得
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
    .eq('series_id', seriesId)
    .eq('is_published', true)
    .order('episode_number', { ascending: true })

  if (error) {
    console.error('Error fetching series works:', error)
    return []
  }

  // 作者情報を取得
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