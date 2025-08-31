export interface Work {
  id: string
  title: string
  author: string
  author_id: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  image_url?: string
  series_title?: string
  episode_number?: number
  is_adult_content?: boolean
  created_at: string
  updated_at: string
  view_count?: number
  like_count?: number
  comment_count?: number
  bookmark_count?: number
}

export interface WorkCardProps {
  work: Work
  isLiked?: boolean
  isBookmarked?: boolean
  hasReadingProgress?: boolean
  readingProgress?: number
}

export interface CategoryChipProps {
  category: string
  isActive: boolean
  onClick: () => void
}