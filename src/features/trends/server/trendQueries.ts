import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { TrendTag, HeroBanner, Announcement } from '../types';

export const getTrendTags = cache(async (): Promise<TrendTag[]> => {
  const startTime = Date.now()
  console.log('[TRENDS TAGS] トレンドタグ取得開始')
  
  try {
    const supabase = await createClient();
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const queryStartTime = Date.now()
    const { data: weeklyWorks, error: weeklyError } = await supabase
      .from('works')
      .select('tags, created_at')
      .eq('is_published', true)
      .gte('created_at', sevenDaysAgo);
    const queryEndTime = Date.now()
    console.log(`[TRENDS TAGS] DB クエリ: ${queryEndTime - queryStartTime}ms`)
    
    if (weeklyError || !weeklyWorks) {
      console.error('Failed to fetch weekly tags:', weeklyError);
      return [];
    }
    
    const processStartTime = Date.now()
    const tagStats = aggregateTagStats(weeklyWorks);
    const trendTags = calculateTrendScores(tagStats);
    const processEndTime = Date.now()
    console.log(`[TRENDS TAGS] データ処理: ${processEndTime - processStartTime}ms`)
    
    // 作品が少ない場合はカテゴリタグで補完
    if (trendTags.length < 8) {
      const categoryStartTime = Date.now()
      const categoryTags = await getCategoryTags(supabase, sevenDaysAgo);
      categoryTags.forEach(categoryTag => {
        if (!trendTags.find(t => t.tag === categoryTag.tag)) {
          trendTags.push(categoryTag);
        }
      });
      const categoryEndTime = Date.now()
      console.log(`[TRENDS TAGS] カテゴリ補完: ${categoryEndTime - categoryStartTime}ms`)
    }
    
    const totalTime = Date.now() - startTime
    console.log(`[TRENDS TAGS] 総処理時間: ${totalTime}ms (結果: ${trendTags.length}件)`)
    
    return trendTags.slice(0, 12);
    
  } catch (error) {
    console.error('getTrendTags error:', error);
    const totalTime = Date.now() - startTime
    console.log(`[TRENDS TAGS] 総処理時間(エラー): ${totalTime}ms`)
    return [];
  }
});

export const getHeroBanners = cache(async (): Promise<HeroBanner[]> => {
  const startTime = Date.now()
  console.log('[TRENDS BANNERS] ヒーローバナー取得開始')
  
  // TODO: 将来的にはデータベースから取得
  const banners = [
    {
      id: '1',
      title: '新機能リリース記念キャンペーン',
      description: '作品投稿機能がパワーアップ！今なら投稿でポイントプレゼント',
      image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=300&fit=crop',
      link_url: '/announcements/campaign-2024',
      is_active: true,
      priority: 1
    }
  ];
  
  const endTime = Date.now()
  console.log(`[TRENDS BANNERS] ヒーローバナー取得完了: ${endTime - startTime}ms`)
  
  return banners;
});

export const getAnnouncements = cache(async (): Promise<Announcement[]> => {
  // TODO: 将来的にはデータベースから取得
  return [];
});

// Helper functions
function aggregateTagStats(works: any[]) {
  const tagStats = new Map<string, { 
    totalCount: number; 
    recentCount: number; 
    todayCount: number;
  }>();
  
  works.forEach(work => {
    if (work.tags && Array.isArray(work.tags)) {
      const isToday = new Date(work.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
      const isRecent = new Date(work.created_at).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000;
      
      work.tags.forEach((tag: any) => {
        if (typeof tag === 'string' && tag.trim()) {
          const normalizedTag = tag.trim().toLowerCase();
          const stats = tagStats.get(normalizedTag) || { 
            totalCount: 0, 
            recentCount: 0,
            todayCount: 0
          };
          
          stats.totalCount++;
          if (isRecent) stats.recentCount++;
          if (isToday) stats.todayCount++;
          
          tagStats.set(normalizedTag, stats);
        }
      });
    }
  });
  
  return tagStats;
}

function calculateTrendScores(tagStats: Map<string, any>): TrendTag[] {
  return Array.from(tagStats.entries())
    .map(([tag, stats]) => {
      const weeklyAverage = stats.totalCount / 7;
      const growthRate = weeklyAverage > 0 
        ? ((stats.todayCount - weeklyAverage) / weeklyAverage) * 100
        : 0;
      
      const recencyBonus = stats.recentCount * 2;
      const todayBonus = stats.todayCount * 3;
      const growthBonus = Math.max(0, growthRate) * 0.5;
      const trendScore = recencyBonus + todayBonus + growthBonus;
      
      return {
        tag: tag,
        count: stats.totalCount,
        trend_score: Math.min(100, trendScore),
        growth_rate: Math.round(growthRate)
      };
    })
    .filter(tag => tag.count >= 2)
    .sort((a, b) => b.trend_score - a.trend_score)
    .slice(0, 20);
}

async function getCategoryTags(supabase: any, sevenDaysAgo: string): Promise<TrendTag[]> {
  const { data: categories, error: catError } = await supabase
    .from('works')
    .select('category')
    .eq('is_published', true)
    .gte('created_at', sevenDaysAgo);
  
  if (catError || !categories) {
    return [];
  }
  
  const categoryCounts = new Map<string, number>();
  categories.forEach((work: any) => {
    if (work.category) {
      const count = categoryCounts.get(work.category) || 0;
      categoryCounts.set(work.category, count + 1);
    }
  });
  
  return Array.from(categoryCounts.entries()).map(([category, count]) => ({
    tag: category.toLowerCase(),
    count: count,
    trend_score: count * 5,
    growth_rate: 0
  }));
}