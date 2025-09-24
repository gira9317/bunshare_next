'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useAuthModal } from '@/components/shared/auth/useAuthModal'
import { LoginFormSection } from '../sections/LoginFormSection'
import { SignupFormSection } from '../sections/SignupFormSection'

export function LoginModal() {
  const { isOpen, mode, close, openLogin, openSignup } = useAuthModal()

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        close()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'hidden' // スクロール無効化
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'unset' // スクロール復元
    }
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={close}
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'login' ? 'ログイン' : '新規登録'}
            </h2>
            <button
              onClick={close}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="閉じる"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {mode === 'login' ? <LoginFormSection /> : <SignupFormSection />}
            
            {/* Toggle between login/signup */}
            <div className="mt-6 text-center">
              {mode === 'login' ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  アカウントをお持ちでない方は{' '}
                  <button
                    onClick={openSignup}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    新規登録
                  </button>
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  既にアカウントをお持ちの方は{' '}
                  <button
                    onClick={openLogin}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    ログイン
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}