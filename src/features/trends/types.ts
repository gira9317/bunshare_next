export type TrendTabType = 'recommended' | 'works-ranking' | 'users-ranking' | 'announcements';

export interface TrendingWork {
  id: string;
  title: string;
  description?: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  thumbnail_url?: string;
  category: string;
  tags: string[];
  like_count: number;
  view_count: number;
  trend_score: number;
  created_at: string;
}

export interface TrendTag {
  tag: string;
  count: number;
  trend_score: number;
  growth_rate: number;
}

export interface HeroBanner {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  is_active: boolean;
  priority: number;
}

export interface WorksRanking {
  id: string;
  title: string;
  author_name: string;
  thumbnail_url?: string;
  rank: number;
  score: number;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface UsersRanking {
  id: string;
  name: string;
  avatar_url?: string;
  followers_count: number;
  works_count: number;
  rank: number;
  score: number;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'update' | 'maintenance' | 'feature' | 'notice';
  published_at: string;
  is_important: boolean;
}