export interface UserProfile {
  id: string
  email: string
  username: string | null
  avatar_img_url: string | null
  header_img_url: string | null
  bio: string | null
  website_url: string[] | null
  public_profile: boolean
  follow_approval: boolean
  role: string
}

export interface UserIconDropdownState {
  isOpen: boolean
  user: UserProfile | null
  isLoading: boolean
}

export interface UserIconMenuItem {
  label: string
  icon: string
  href?: string
  onClick?: () => void
  divider?: boolean
}