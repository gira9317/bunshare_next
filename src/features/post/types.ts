export interface Series {
  series_id: string
  title: string
  description: string | null
  cover_image_url: string | null
}

export interface Draft {
  work_id: string
  title: string
  description: string | null
  content: string | null
  category: string | null
  updated_at: string
  is_adult_content: boolean
}

export interface PostFormData {
  title: string
  description: string
  content: string
  category: string
  tags: string[]
  image_url?: string
  series_id?: string
  episode_number?: number
  is_adult_content: boolean
  is_private: boolean
  is_published: boolean
}