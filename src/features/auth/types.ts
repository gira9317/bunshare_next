export interface User {
  id: string
  email: string
  username: string | null
  provider: string | null
  sign_in_time: string | null
  birth_date: string | null
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
  bio: string | null
  agree_marketing: boolean
  role: string
  avatar_img_url: string | null
  header_img_url: string | null
  custom_user_id: string | null
  website_url: string[] | null
  public_profile: boolean
  follow_approval: boolean
  like_notification: boolean
  comment_notification: boolean
  follow_notification: boolean
  email_notification: boolean
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface PasswordValidation {
  hasMinLength: boolean
  hasNumber: boolean
  hasLetter: boolean
  isValid: boolean
}

export type AuthProvider = 'google' | 'email'