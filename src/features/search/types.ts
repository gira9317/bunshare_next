export interface SearchFilters {
  category: string;
  sort: string;
  type?: 'all' | 'works' | 'users';
}

export interface SearchResult {
  work_id: string;
  title: string;
  category: string;
  views: number;
  likes: number;
  comments: number;
  // 新しい集計カラム
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  rating: number;
  average_rating: number;
  total_ratings: number;
  content_quality_score: number;
  score_normalized: number;
  description: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  series_id?: string;
  episode_number?: number;
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  tags?: string[];
}

export interface AuthorResult {
  user_id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  followers_count: number;
  works_count: number;
  total_likes: number;
}

export interface SearchResponse {
  works: SearchResult[];
  authors: AuthorResult[];
  total_works: number;
  total_authors: number;
  has_more_works: boolean;
  has_more_authors: boolean;
}

export interface SearchParams {
  query: string;
  filters: SearchFilters;
  page: number;
  limit: number;
}

export type SortType = 
  | 'relevance'
  | 'popular_today'
  | 'popular_week'
  | 'popular_month'
  | 'popular_all'
  | 'likes'
  | 'newest'
  | 'oldest';

export type CategoryType = 'all' | '小説' | '詩' | 'エッセイ';
export type RatingType = 'all' | '4+' | '3+';

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  authors: AuthorResult[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalResults: number;
}