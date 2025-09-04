import { useAuth } from '@/components/shared/AuthProvider'
import { useAuthModal } from '@/components/shared/auth/useAuthModal'
import { useRouter } from 'next/navigation'

export function useRequireAuth() {
  const { user } = useAuth()
  const { openLogin, setReturnUrl } = useAuthModal()
  const router = useRouter()

  const requireAuth = (action?: () => void | Promise<void>, returnUrl?: string) => {
    if (!user) {
      if (returnUrl) {
        setReturnUrl(returnUrl)
      }
      openLogin()
      return false
    }
    
    // ユーザーがログイン済みの場合、アクションを実行
    if (action) {
      action()
    }
    return true
  }

  const requireAuthAsync = async (
    action: () => Promise<{ error?: string }>,
    errorHandler?: (error: string) => void
  ) => {
    if (!user) {
      openLogin()
      return { error: 'ログインが必要です' }
    }

    try {
      const result = await action()
      
      // Server Actionから「ログインが必要です」エラーが返された場合
      if (result.error === 'ログインが必要です') {
        openLogin()
        return result
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作に失敗しました'
      
      if (errorHandler) {
        errorHandler(errorMessage)
      }
      
      return { error: errorMessage }
    }
  }

  return {
    isAuthenticated: !!user,
    user,
    requireAuth,
    requireAuthAsync
  }
}