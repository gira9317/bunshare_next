export interface UserProfile {
  id: string
  email: string
  username: string | null
  custom_user_id: string | null
  bio: string | null
  avatar_img_url: string | null
  header_img_url: string | null
  website_url: string[] | null
  birth_date: string | null
  gender: string | null
  public_profile: boolean
  follow_approval: boolean
  like_notification: boolean
  comment_notification: boolean
  follow_notification: boolean
  email_notification: boolean
  sign_in_time: string
  role: string
  provider: string | null
  agree_marketing: boolean
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
  follow_approval_required?: boolean
}

export interface FollowRelation {
  follower_id: string
  followed_id: string
  status: 'pending' | 'approved'
  created_at: string
}

export interface UserProfileUpdateInput {
  username?: string
  custom_user_id?: string
  bio?: string
  avatar_img_url?: string
  header_img_url?: string
  website_url?: string[]
  birth_date?: string
  gender?: string
  public_profile?: boolean
  follow_approval?: boolean
  like_notification?: boolean
  comment_notification?: boolean
  follow_notification?: boolean
  email_notification?: boolean
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