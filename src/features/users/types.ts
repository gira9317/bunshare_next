export interface UserProfile {
  id: string
  email: string
  username: string
  display_name?: string
  bio?: string
  avatar_url?: string
  cover_url?: string
  website_url?: string
  is_public: boolean
  follow_approval_required: boolean
  created_at: string
  updated_at: string
}

export interface UserStats {
  followers_count: number
  following_count: number
  works_count: number
  likes_count: number
  bookmarks_count: number
}

export interface UserWithStats extends UserProfile {
  stats: UserStats
}

export interface FollowRelation {
  follower_id: string
  following_id: string
  status: 'pending' | 'approved'
  created_at: string
}

export interface UserProfileUpdateInput {
  username?: string
  display_name?: string
  bio?: string
  avatar_url?: string
  cover_url?: string
  website_url?: string
  is_public?: boolean
  follow_approval_required?: boolean
}

export interface UserWork {
  work_id: string
  title: string
  description?: string
  content?: string
  category: string
  is_published: boolean
  is_private: boolean
  created_at: string
  updated_at: string
  likes_count: number
  comments_count: number
  views_count: number
}