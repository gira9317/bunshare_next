'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ページ読み込み時の初期テーマ設定（フラッシュ防止）
    const savedTheme = localStorage.getItem('theme') || 'system'
    const root = document.documentElement
    
    if (savedTheme === 'dark') {
      root.classList.add('dark')
    } else if (savedTheme === 'light') {
      root.classList.remove('dark')
    } else if (savedTheme === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (systemIsDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [])

  return <>{children}</>
}