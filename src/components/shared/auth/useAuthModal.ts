import { useAuthModalContext } from './AuthModalProvider'

export function useAuthModal() {
  const { 
    isOpen, 
    mode, 
    openLogin, 
    openSignup, 
    close, 
    returnUrl, 
    setReturnUrl 
  } = useAuthModalContext()

  return {
    isOpen,
    mode,
    openLogin,
    openSignup,
    close,
    returnUrl,
    setReturnUrl
  }
}