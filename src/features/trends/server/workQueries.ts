import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { TrendingWork } from '../types';

export const getTrendingWorks = cache(async (): Promise<TrendingWork[]> => {
  const startTime = Date.now()
  console.log('[TRENDS WORKS QUERY] トレンド作品クエリ開始')
  
  try {
    const supabase = await createClient();
    
    // Use the new trend_score column for fast trending works retrieval (軽量化版)
    const queryStartTime = Date.now()
    const { data: works, error } = await supabase
      .from('works')
      .select('work_id, title, description, trend_score, image_url, category, tags, views_count, likes_count, user_id')
      .eq('is_published', true)
      .gt('trend_score', 0)
      .order('trend_score', { ascending: false })
      .limit(3);
    const queryEndTime = Date.now()
    console.log(`[TRENDS WORKS QUERY] DB クエリ（軽量化）: ${queryEndTime - queryStartTime}ms`)
    
    if (error || !works) {
      console.error('Failed to fetch trending works:', error);
      // Fallback to recent works if trending query fails
      const fallbackStartTime = Date.now()
      const fallbackResult = await getNewWorks(supabase);
      const fallbackEndTime = Date.now()
      console.log(`[TRENDS WORKS QUERY] フォールバック処理: ${fallbackEndTime - fallbackStartTime}ms`)
      return fallbackResult;
    }
    
    const processStartTime = Date.now()
    const result = works.map(work => ({
      id: work.work_id,
      title: work.title || '無題',
      description: work.description,
      author: {
        id: work.user_id || '',
        name: '作者名', // 後で必要に応じて取得
        avatar_url: null
      },
      thumbnail_url: work.image_url,
      category: work.category || 'その他',
      tags: work.tags || [],
      like_count: work.likes_count || 0,
      view_count: work.views_count || 0,
      trend_score: work.trend_score || 0
    }));
    const processEndTime = Date.now()
    console.log(`[TRENDS WORKS QUERY] データ処理（軽量化）: ${processEndTime - processStartTime}ms`)
    
    const totalTime = Date.now() - startTime
    console.log(`[TRENDS WORKS QUERY] 総処理時間: ${totalTime}ms (結果: ${result.length}件)`)
    
    return result;
    
  } catch (error) {
    console.error('getTrendingWorks error:', error);
    const totalTime = Date.now() - startTime
    console.log(`[TRENDS WORKS QUERY] 総処理時間(エラー): ${totalTime}ms`)
    return [];
  }
});

export const getWorksRanking = cache(async (
  period: 'all' | 'daily' | 'weekly' | 'monthly' = 'all', 
  limit: number = 3
) => {
  try {
    const supabase = await createClient();
    
    let dateFilter: string | null = null;
    switch (period) {
      case 'daily':
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'weekly':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'monthly':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'all':
      default:
        dateFilter = null;
        break;
    }
    
    let query = supabase
      .from('works')
      .select(getWorksSelectQuery())
      .eq('is_published', true);
    
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }
    
    const { data: works, error } = await query
      .order('views', { ascending: false })
      .limit(limit);
    
    if (error || !works) {
      console.error('Failed to fetch works ranking:', error);
      return [];
    }
    
    return works.map((work, index) => ({
      work_id: work.work_id,
      title: work.title || '無題',
      description: work.description,
      image_url: work.use_series_image && work.series?.cover_image_url 
        ? work.series.cover_image_url 
        : work.image_url,
      category: work.category || 'その他',
      tags: work.tags || [],
      views: work.views_count || 0,
      likes: work.likes_count || 0,
      comments: work.comments_count || 0,
      views_count: work.views_count || 0,
      likes_count: work.likes_count || 0,
      comments_count: work.comments_count || 0,
      author: work.users?.username || '名無しの作者',
      author_id: work.users?.id || '',
      series_title: work.series?.title,
      episode_number: work.episode_number,
      use_series_image: work.use_series_image,
      series_cover_image_url: work.series?.cover_image_url,
      rank: index + 1,
      score: (work.views_count || 0) + (work.likes_count || 0) * 2 + (work.comments_count || 0) * 3,
      period: period
    }));
    
  } catch (error) {
    console.error('getWorksRanking error:', error);
    return [];
  }
});

// Helper functions
function getWorksSelectQuery(): string {
  return `
    work_id,
    title,
    description,
    image_url,
    category,
    tags,
    views_count,
    likes_count,
    comments_count,
    created_at,
    series_id,
    episode_number,
    use_series_image,
    users!works_user_id_fkey (
      id,
      username,
      avatar_img_url
    ),
    series (
      id,
      title,
      cover_image_url
    )
  `;
}

function getWorksSelectQueryWithTrendScore(): string {
  return `
    work_id,
    title,
    description,
    image_url,
    category,
    tags,
    views_count,
    likes_count,
    comments_count,
    created_at,
    series_id,
    episode_number,
    use_series_image,
    trend_score,
    recent_views_24h,
    recent_views_7d,
    users!works_user_id_fkey (
      id,
      username,
      avatar_img_url
    ),
    series (
      id,
      title,
      cover_image_url
    )
  `;
}

function formatWorkData(work: any): TrendingWork {
  return {
    id: work.work_id,
    title: work.title || '無題',
    description: work.description,
    author: {
      id: work.users?.id || '',
      name: work.users?.username || '名無しの作者',
      avatar_url: work.users?.avatar_img_url
    },
    thumbnail_url: work.use_series_image && work.series?.cover_image_url 
      ? work.series.cover_image_url 
      : work.image_url,
    category: work.category || 'その他',
    tags: work.tags || [],
    like_count: work.likes_count || 0,
    view_count: work.views_count || 0,
    trend_score: 0,
    created_at: work.created_at
  };
}

async function getFallbackWorks(supabase: any, sevenDaysAgo: string): Promise<TrendingWork[]> {
  const { data: fallbackWorks, error: fallbackError } = await supabase
    .from('works')
    .select(getWorksSelectQuery())
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (fallbackError || !fallbackWorks) {
    console.error('Fallback fetch failed:', fallbackError);
    return [];
  }
  
  return fallbackWorks.map(work => formatWorkData(work));
}

async function getNewWorks(supabase: any, sevenDaysAgo?: string): Promise<TrendingWork[]> {
  let query = supabase
    .from('works')
    .select(getWorksSelectQuery())
    .eq('is_published', true);
    
  if (sevenDaysAgo) {
    query = query.gte('created_at', sevenDaysAgo);
  }
  
  const { data: newWorks, error: newError } = await query
    .order('views', { ascending: false })
    .limit(3);
    
  if (newError || !newWorks) {
    console.error('New works fetch failed:', newError);
    return [];
  }
  
  return newWorks.map(work => formatWorkData(work));
}