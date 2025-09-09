export interface Work {
  work_id: string
  user_id: string
  title: string
  author?: string
  author_username?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  image_url?: string
  series_id?: string
  series_title?: string
  series_cover_image_url?: string
  episode_number?: number
  use_series_image?: boolean
  is_adult_content?: boolean
  created_at: string
  updated_at: string
  views?: number
  likes?: number
  comments?: number
  rating?: number
  readingProgress?: number
  readingPosition?: number
  lastReadAt?: string
  // デバッグ用スコア情報
  quality_score?: number
  user_behavior_score?: number
  recommendation_score?: number
  // スコア詳細
  ctr_stats?: {
    impression_count?: number
    ctr_unique?: number
  }
  snapshot_views?: number
  snapshot_likes?: number
  snapshot_comments?: number
  is_followed_author?: boolean
  is_category_match?: boolean
  is_tag_match?: boolean
  is_new_work?: boolean
}

export interface WorkCardProps {
  work: Work
  isLiked?: boolean
  isBookmarked?: boolean
  hasReadingProgress?: boolean
  readingProgress?: number
  isManagementMode?: boolean
  onRemove?: (workId: string) => void
  onMove?: (workId: string, targetFolder: string) => void
  availableFolders?: Array<{ folder_key: string; folder_name: string }>
  disableNavigation?: boolean
  disableContinueDialog?: boolean
}

export interface CategoryChipProps {
  category: string
  isActive: boolean
  onClick: () => void
}

export interface Comment {
  review_id: string
  work_id: string
  user_id: string
  comment: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    username: string
    avatar_url?: string
  }
}

export interface ReadingBookmark {
  id: string
  user_id: string
  work_id: string
  scroll_position: number
  reading_progress: number
  bookmark_text?: string
  created_at: string
  updated_at: string
}

export interface ShareRecord {
  id: string
  user_id: string
  work_id: string
  share_type: 'twitter' | 'facebook' | 'line' | 'copy_link' | 'native'
  shared_at: string
  shared_url?: string
  share_text?: string
  created_at: string
  updated_at: string
}