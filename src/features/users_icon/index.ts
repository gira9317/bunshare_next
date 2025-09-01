// Client Components
export { UserIconDropdownSection } from './sections/UserIconDropdownSection'
export { UserIconAvatar } from './leaf/UserIconAvatar'
export { UserIconMenu } from './leaf/UserIconMenu'
export { UserIconMenuItem } from './leaf/UserIconMenuItem'
export { ThemeSelector } from './leaf/ThemeSelector'
export { useUserIcon } from './hooks/useUserIcon'

// Types only
export type { UserProfile, UserIconDropdownState, UserIconMenuItem as UserIconMenuItemType } from './types'

// Server Components and Actions are exported separately to avoid client/server issues