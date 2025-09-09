import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { TrendingWork, TrendTag, HeroBanner, WorksRanking, UsersRanking, Announcement } from '../types';

export const getTrendingWorks = cache(async () => {
  try {
    const supabase = await createClient();
    
    // 過去24時間のビュー数を集計して急上昇作品を取得
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // まず過去24時間で最も閲覧された作品IDを取得
    const { data: trendingIds, error: trendingError } = await supabase
      .from('views_log')
      .select('work_id')
      .gte('viewed_at', twentyFourHoursAgo)
      .order('viewed_at', { ascending: false });
    
    if (trendingError) {
      console.error('Failed to fetch trending IDs:', trendingError);
      // エラー時はフォールバック：最新の公開作品を取得
      const { data: fallbackWorks, error: fallbackError } = await supabase
        .from('works')
        .select(`
          work_id,
          title,
          description,
          image_url,
          category,
          tags,
          views,
          likes,
          comments,
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
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (fallbackError || !fallbackWorks) {
        console.error('Fallback fetch failed:', fallbackError);
        return [];
      }
      
      return fallbackWorks.map(work => formatWorkData(work));
    }
    
    // 作品IDごとのビュー数をカウント
    const viewCounts = new Map<string, number>();
    if (trendingIds) {
      trendingIds.forEach(item => {
        const count = viewCounts.get(item.work_id) || 0;
        viewCounts.set(item.work_id, count + 1);
      });
    }
    
    // ビュー数でソートして上位のIDを取得
    const sortedIds = Array.from(viewCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);
    
    if (sortedIds.length === 0) {
      // 24時間以内のビューがない場合は新着作品を返す
      const { data: newWorks, error: newError } = await supabase
        .from('works')
        .select(`
          work_id,
          title,
          description,
          image_url,
          category,
          tags,
          views,
          likes,
          comments,
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
        `)
        .eq('is_published', true)
        .gte('created_at', sevenDaysAgo)
        .order('views', { ascending: false })
        .limit(3);
        
      if (newError || !newWorks) {
        console.error('New works fetch failed:', newError);
        return [];
      }
      
      return newWorks.map(work => formatWorkData(work));
    }
    
    // 上位作品の詳細情報を取得
    const { data: works, error: worksError } = await supabase
      .from('works')
      .select(`
        work_id,
        title,
        description,
        image_url,
        category,
        tags,
        views,
        likes,
        comments,
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
      `)
      .in('work_id', sortedIds)
      .eq('is_published', true);
    
    if (worksError || !works) {
      console.error('Works fetch failed:', worksError);
      return [];
    }
    
    // ビュー数でソートし、トレンドスコアを計算
    const sortedWorks = works
      .map(work => ({
        ...formatWorkData(work),
        recentViews: viewCounts.get(work.work_id) || 0
      }))
      .sort((a, b) => b.recentViews - a.recentViews)
      .slice(0, 3)
      .map(work => {
        // トレンドスコアを計算（24時間のビュー数 + いいね数 + 新着ボーナス）
        const isNew = new Date(work.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
        const newBonus = isNew ? 20 : 0;
        const trendScore = (work.recentViews * 2) + (work.like_count * 3) + newBonus;
        
        return {
          ...work,
          trend_score: Math.min(100, trendScore / 10) // 0-100にスケール
        };
      });
    
    return sortedWorks;
    
  } catch (error) {
    console.error('getTrendingWorks error:', error);
    return [];
  }
});

// ワークデータを統一フォーマットに変換
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
    like_count: work.likes || 0,
    view_count: work.views || 0,
    trend_score: 0, // 後で計算
    created_at: work.created_at
  };
}

export const getTrendTags = cache(async (): Promise<TrendTag[]> => {
  try {
    const supabase = await createClient();
    
    // 過去7日間と過去24時間のタグを集計
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // 過去7日間の全作品のタグを取得
    const { data: weeklyWorks, error: weeklyError } = await supabase
      .from('works')
      .select('tags, created_at')
      .eq('is_published', true)
      .gte('created_at', sevenDaysAgo);
    
    if (weeklyError || !weeklyWorks) {
      console.error('Failed to fetch weekly tags:', weeklyError);
      return [];
    }
    
    // タグごとの出現頻度を集計
    const tagStats = new Map<string, { 
      totalCount: number; 
      recentCount: number; 
      todayCount: number;
    }>();
    
    weeklyWorks.forEach(work => {
      if (work.tags && Array.isArray(work.tags)) {
        const isToday = new Date(work.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
        const isRecent = new Date(work.created_at).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000;
        
        work.tags.forEach(tag => {
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
    
    // トレンドスコアと成長率を計算してソート
    const trendTags = Array.from(tagStats.entries())
      .map(([tag, stats]) => {
        // 成長率の計算（今日 vs 週平均）
        const weeklyAverage = stats.totalCount / 7;
        const growthRate = weeklyAverage > 0 
          ? ((stats.todayCount - weeklyAverage) / weeklyAverage) * 100
          : 0;
        
        // トレンドスコアの計算（最近の使用頻度 + 成長率）
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
      .filter(tag => tag.count >= 2) // 最低2回以上使用されたタグのみ
      .sort((a, b) => b.trend_score - a.trend_score)
      .slice(0, 20); // 上位20個を取得
    
    // 人気のカテゴリタグを補完（作品が少ない場合）
    if (trendTags.length < 8) {
      // カテゴリベースのタグも取得
      const { data: categories, error: catError } = await supabase
        .from('works')
        .select('category')
        .eq('is_published', true)
        .gte('created_at', sevenDaysAgo);
      
      if (!catError && categories) {
        const categoryCounts = new Map<string, number>();
        categories.forEach(work => {
          if (work.category) {
            const count = categoryCounts.get(work.category) || 0;
            categoryCounts.set(work.category, count + 1);
          }
        });
        
        // カテゴリをタグとして追加
        categoryCounts.forEach((count, category) => {
          if (!trendTags.find(t => t.tag === category.toLowerCase())) {
            trendTags.push({
              tag: category.toLowerCase(),
              count: count,
              trend_score: count * 5,
              growth_rate: 0
            });
          }
        });
      }
    }
    
    return trendTags.slice(0, 12); // 最大12個まで表示
    
  } catch (error) {
    console.error('getTrendTags error:', error);
    return [];
  }
});

export const getHeroBanners = cache(async (): Promise<HeroBanner[]> => {
  // ダミーデータを返す
  return [
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
});

export const getWorksRanking = cache(async (period: 'all' | 'daily' | 'weekly' | 'monthly' = 'all', limit: number = 3) => {
  try {
    const supabase = await createClient();
    
    // 期間の設定
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
    
    // 基本クエリ
    let query = supabase
      .from('works')
      .select(`
        work_id,
        title,
        description,
        image_url,
        category,
        tags,
        views,
        likes,
        comments,
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
      `)
      .eq('is_published', true);
    
    // 期間フィルタを適用
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }
    
    // スコア計算してソート（ビュー数 + いいね数×2 + コメント数×3）
    const { data: works, error } = await query
      .order('views', { ascending: false })
      .limit(limit);
    
    if (error || !works) {
      console.error('Failed to fetch works ranking:', error);
      return [];
    }
    
    // WorkCardPropsに適合する形式に変換
    return works.map((work, index) => ({
      work_id: work.work_id,
      title: work.title || '無題',
      description: work.description,
      image_url: work.use_series_image && work.series?.cover_image_url 
        ? work.series.cover_image_url 
        : work.image_url,
      category: work.category || 'その他',
      tags: work.tags || [],
      views: work.views || 0,
      likes: work.likes || 0,
      comments: work.comments || 0,
      author: work.users?.username || '名無しの作者',
      author_id: work.users?.id || '',
      series_title: work.series?.title,
      episode_number: work.episode_number,
      use_series_image: work.use_series_image,
      series_cover_image_url: work.series?.cover_image_url,
      rank: index + 1,
      score: (work.views || 0) + (work.likes || 0) * 2 + (work.comments || 0) * 3,
      period: period
    }));
    
  } catch (error) {
    console.error('getWorksRanking error:', error);
    return [];
  }
});

export const getUsersRanking = cache(async (category: 'posts' | 'likes' | 'views' | 'followers' | 'newcomers' | 'interactions', limit: number = 3) => {
  try {
    const supabase = await createClient();
    
    let query;
    
    switch (category) {
      case 'posts': {
        // 📝 投稿の達人 - 作品投稿数
        const { data: users, error } = await supabase
          .from('users')
          .select(`
            id,
            username,
            custom_user_id,
            avatar_img_url,
            bio
          `);
        
        if (error || !users) {
          console.error('Failed to fetch users for posts ranking:', error);
          return [];
        }
        
        // works_countを手動で集計
        const usersWithCounts = await Promise.all(users.map(async (user) => {
          const { count } = await supabase
            .from('works')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_published', true);
          
          return {
            ...user,
            works_count: count || 0,
            followers_count: 0,
            following_count: 0
          };
        }));
        
        return usersWithCounts
          .filter(user => user.works_count > 0)
          .sort((a, b) => b.works_count - a.works_count)
          .slice(0, limit);
      }
      
      case 'likes': {
        // ❤️ 人気作家 - 獲得いいね総数
        const { data: works, error } = await supabase
          .from('works')
          .select('user_id, likes')
          .eq('is_published', true);
        
        if (error || !works) {
          console.error('Failed to fetch likes ranking:', error);
          return [];
        }
        
        // ユーザーごとのいいね合計を集計
        const likesMap = new Map<string, number>();
        works.forEach(work => {
          if (work.user_id) {
            const current = likesMap.get(work.user_id) || 0;
            likesMap.set(work.user_id, current + (work.likes || 0));
          }
        });
        
        // 上位ユーザーのIDを取得
        const topUserIds = Array.from(likesMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => id);
        
        // ユーザー情報を取得
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('id', topUserIds);
        
        if (usersError || !users) return [];
        
        return users.map(user => ({
          ...user,
          works_count: 0,
          followers_count: 0,
          following_count: 0,
          total_likes: likesMap.get(user.id) || 0
        })).sort((a, b) => b.total_likes - a.total_likes);
      }
      
      case 'views': {
        // 👁 注目作家 - 総閲覧数
        const { data: works, error } = await supabase
          .from('works')
          .select('user_id, views')
          .eq('is_published', true);
        
        if (error || !works) {
          console.error('Failed to fetch views ranking:', error);
          return [];
        }
        
        // ユーザーごとの閲覧数合計を集計
        const viewsMap = new Map<string, number>();
        works.forEach(work => {
          if (work.user_id) {
            const current = viewsMap.get(work.user_id) || 0;
            viewsMap.set(work.user_id, current + (work.views || 0));
          }
        });
        
        // 上位ユーザーのIDを取得
        const topUserIds = Array.from(viewsMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => id);
        
        // ユーザー情報を取得
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('id', topUserIds);
        
        if (usersError || !users) return [];
        
        return users.map(user => ({
          ...user,
          works_count: 0,
          followers_count: 0,
          following_count: 0,
          total_views: viewsMap.get(user.id) || 0
        })).sort((a, b) => b.total_views - a.total_views);
      }
      
      case 'followers': {
        // 👥 インフルエンサー - フォロワー数
        const { data: users, error } = await supabase
          .from('users')
          .select(`
            id,
            username,
            custom_user_id,
            avatar_img_url,
            bio
          `);
        
        if (error || !users) {
          console.error('Failed to fetch users for followers ranking:', error);
          return [];
        }
        
        // フォロワー数を手動で集計（followed_idが正しいカラム名）
        const usersWithCounts = await Promise.all(users.map(async (user) => {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('followed_id', user.id)
            .eq('status', 'approved');
          
          return {
            ...user,
            works_count: 0,
            followers_count: count || 0,
            following_count: 0
          };
        }));
        
        return usersWithCounts
          .filter(user => user.followers_count > 0)
          .sort((a, b) => b.followers_count - a.followers_count)
          .slice(0, limit);
      }
      
      case 'newcomers': {
        // 🌟 新人作家 - 30日以内登録で高エンゲージメント
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: newUsers, error } = await supabase
          .from('users')
          .select('*')
          .gte('sign_in_time', thirtyDaysAgo)
          .order('sign_in_time', { ascending: false });
        
        if (error || !newUsers) {
          console.error('Failed to fetch newcomers ranking:', error);
          return [];
        }
        
        // 各新人のエンゲージメントを計算
        const usersWithEngagement = await Promise.all(newUsers.map(async (user) => {
          const { data: works } = await supabase
            .from('works')
            .select('likes, views')
            .eq('user_id', user.id)
            .eq('is_published', true);
          
          const totalLikes = works?.reduce((sum, w) => sum + (w.likes || 0), 0) || 0;
          const totalViews = works?.reduce((sum, w) => sum + (w.views || 0), 0) || 0;
          const engagement = totalLikes * 2 + totalViews * 0.1; // エンゲージメントスコア
          
          return {
            ...user,
            works_count: works?.length || 0,
            followers_count: 0,
            following_count: 0,
            engagement_score: engagement
          };
        }));
        
        return usersWithEngagement
          .sort((a, b) => b.engagement_score - a.engagement_score)
          .slice(0, limit);
      }
      
      case 'interactions': {
        // 💬 交流の達人 - コメント活動数
        // 現在コメントテーブルがないので仮実装
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .limit(limit);
        
        if (error || !users) {
          console.error('Failed to fetch interactions ranking:', error);
          return [];
        }
        
        return users.map(user => ({
          ...user,
          works_count: 0,
          followers_count: 0,
          following_count: 0,
          interaction_score: 0
        }));
      }
      
      default:
        return [];
    }
    
  } catch (error) {
    console.error('getUsersRanking error:', error);
    return [];
  }
});

export const getAnnouncements = cache(async (): Promise<Announcement[]> => {
  // ダミーデータを返す
  return [];
});