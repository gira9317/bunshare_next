import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

interface UserRankingResult {
  id: string;
  username: string | null;
  custom_user_id: string | null;
  avatar_img_url: string | null;
  bio: string | null;
  works_count: number;
  followers_count: number;
  following_count: number;
  total_likes?: number;
  total_views?: number;
  engagement_score?: number;
  interaction_score?: number;
}

export const getUsersRanking = cache(async (
  category: 'posts' | 'likes' | 'views' | 'followers' | 'newcomers' | 'interactions', 
  limit: number = 3
): Promise<UserRankingResult[]> => {
  try {
    const supabase = await createClient();
    
    switch (category) {
      case 'posts':
        return await getPostsRanking(supabase, limit);
      case 'likes':
        return await getLikesRanking(supabase, limit);
      case 'views':
        return await getViewsRanking(supabase, limit);
      case 'followers':
        return await getFollowersRanking(supabase, limit);
      case 'newcomers':
        return await getNewcomersRanking(supabase, limit);
      case 'interactions':
        return await getInteractionsRanking(supabase, limit);
      default:
        return [];
    }
  } catch (error) {
    console.error('getUsersRanking error:', error);
    return [];
  }
});

// 📝 投稿の達人 - 作品投稿数順
async function getPostsRanking(supabase: any, limit: number): Promise<UserRankingResult[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, custom_user_id, avatar_img_url, bio, works_count, followers_count, following_count')
    .gt('works_count', 0)
    .order('works_count', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Failed to fetch posts ranking:', error);
    return [];
  }
  
  return data.map((user: any) => ({
    ...user,
    works_count: user.works_count || 0,
    followers_count: user.followers_count || 0,
    following_count: user.following_count || 0
  }));
}

// ❤️ 人気作家 - 総いいね数順
async function getLikesRanking(supabase: any, limit: number): Promise<UserRankingResult[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, custom_user_id, avatar_img_url, bio, works_count, followers_count, following_count, total_likes')
    .gt('total_likes', 0)
    .order('total_likes', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Failed to fetch likes ranking:', error);
    return [];
  }
  
  return data.map((user: any) => ({
    ...user,
    works_count: user.works_count || 0,
    followers_count: user.followers_count || 0,
    following_count: user.following_count || 0,
    total_likes: user.total_likes || 0
  }));
}

// 👁 注目作家 - 総閲覧数順
async function getViewsRanking(supabase: any, limit: number): Promise<UserRankingResult[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, custom_user_id, avatar_img_url, bio, works_count, followers_count, following_count, total_views')
    .gt('total_views', 0)
    .order('total_views', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Failed to fetch views ranking:', error);
    return [];
  }
  
  return data.map((user: any) => ({
    ...user,
    works_count: user.works_count || 0,
    followers_count: user.followers_count || 0,
    following_count: user.following_count || 0,
    total_views: user.total_views || 0
  }));
}

// 👥 インフルエンサー - フォロワー数順
async function getFollowersRanking(supabase: any, limit: number): Promise<UserRankingResult[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, custom_user_id, avatar_img_url, bio, works_count, followers_count, following_count')
    .gt('followers_count', 0)
    .order('followers_count', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Failed to fetch followers ranking:', error);
    return [];
  }
  
  return data.map((user: any) => ({
    ...user,
    works_count: user.works_count || 0,
    followers_count: user.followers_count || 0,
    following_count: user.following_count || 0
  }));
}

// 🌟 新人作家 - 30日以内登録で高エンゲージメント
async function getNewcomersRanking(supabase: any, limit: number): Promise<UserRankingResult[]> {
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
  
  const usersWithEngagement = await Promise.all(newUsers.map(async (user: any) => {
    const { data: works } = await supabase
      .from('works')
      .select('likes, views')
      .eq('user_id', user.id)
      .eq('is_published', true);
    
    const totalLikes = works?.reduce((sum: number, w: any) => sum + (w.likes || 0), 0) || 0;
    const totalViews = works?.reduce((sum: number, w: any) => sum + (w.views || 0), 0) || 0;
    const engagement = totalLikes * 2 + totalViews * 0.1;
    
    return {
      ...user,
      works_count: works?.length || 0,
      followers_count: 0,
      following_count: 0,
      engagement_score: engagement
    };
  }));
  
  return usersWithEngagement
    .sort((a, b) => b.engagement_score! - a.engagement_score!)
    .slice(0, limit);
}

// 💬 交流の達人 - コメント活動数順
async function getInteractionsRanking(supabase: any, limit: number): Promise<UserRankingResult[]> {
  // TODO: コメントテーブル実装後に本格的なクエリを作成
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .limit(limit);
  
  if (error || !users) {
    console.error('Failed to fetch interactions ranking:', error);
    return [];
  }
  
  return users.map((user: any) => ({
    ...user,
    works_count: 0,
    followers_count: 0,
    following_count: 0,
    interaction_score: 0
  }));
}