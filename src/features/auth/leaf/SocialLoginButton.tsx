'use client'

import { AuthProvider } from '../types'

interface SocialLoginButtonProps {
  provider: AuthProvider
  onClick: () => void
  loading?: boolean
  className?: string
}

const providerConfig = {
  google: {
    name: 'Google',
    icon: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
    className: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  },
} as const

export function SocialLoginButton({
  provider,
  onClick,
  loading = false,
  className = '',
}: SocialLoginButtonProps) {
  const config = providerConfig[provider]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${config.className} ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      ) : (
        <img src={config.icon} alt={config.name} className="w-5 h-5" />
      )}
      <span>{config.name}でログイン</span>
    </button>
  )
}