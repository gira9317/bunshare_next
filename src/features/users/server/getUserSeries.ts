import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { Series } from '../schemas'

export const getUserSeries = cache(async (userId: string): Promise<Series[]> => {
  const supabase = await createClient()
  
  // Get series for the user
  const { data: seriesData, error: seriesError } = await supabase
    .from('series')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (seriesError || !seriesData) {
    console.error('Error fetching user series:', seriesError)
    return []
  }

  // Get aggregated work information for each series
  const seriesWithStats = await Promise.all(
    seriesData.map(async (series) => {
      // Get work count and stats for this series using statistical columns
      const { data: works, error: worksError } = await supabase
        .from('works')
        .select('work_id, views_count, likes_count, image_url, created_at')
        .eq('series_id', series.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (worksError) {
        console.error(`Error fetching works for series ${series.id}:`, worksError)
        return {
          ...series,
          works_count: 0,
          latest_work_image: series.cover_image_url,
          total_views: 0,
          total_likes: 0
        }
      }

      const works_count = works?.length || 0
      const total_views = works?.reduce((sum, work) => sum + (work.views_count || 0), 0) || 0
      const total_likes = works?.reduce((sum, work) => sum + (work.likes_count || 0), 0) || 0
      const latest_work_image = works?.[0]?.image_url || series.cover_image_url
      
      // Get up to 3 work images for stacked display
      const work_images = works
        ?.slice(0, 3)
        .map(work => work.image_url)
        .filter(Boolean) || []

      return {
        ...series,
        works_count,
        work_images,
        latest_work_image,
        total_views,
        total_likes
      }
    })
  )

  return seriesWithStats as Series[]
})