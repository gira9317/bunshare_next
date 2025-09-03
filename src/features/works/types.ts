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
  episode_number?: number
  is_adult_content?: boolean
  created_at: string
  updated_at: string
  views?: number
  likes?: number
  comments?: number
  rating?: number
  readingProgress?: number
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