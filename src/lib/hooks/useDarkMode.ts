'use client'

import { useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>('light')
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // ローカルストレージからテーマ設定を読み込み
    const savedTheme = localStorage.getItem('theme') as Theme | null
    console.log('Saved theme:', savedTheme)
    
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else {
      // デフォルトはライトテーマ（ブラウザ設定無視）
      setTheme('light')
      applyTheme('light')
    }

    // システムテーマの変更を監視（systemモード時のみ）
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      const currentTheme = localStorage.getItem('theme') as Theme | null
      // ユーザーが明示的に'system'を選択した場合のみ連動
      if (currentTheme === 'system') {
        console.log('System theme changed, reapplying...')
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  const applyTheme = (currentTheme: Theme) => {
    console.log('Applying theme:', currentTheme)
    const root = document.documentElement
    
    if (currentTheme === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      console.log('System is dark:', systemIsDark)
      setIsDark(systemIsDark)
      
      if (systemIsDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    } else {
      const shouldBeDark = currentTheme === 'dark'
      console.log('Should be dark:', shouldBeDark)
      setIsDark(shouldBeDark)
      
      if (shouldBeDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    
    console.log('HTML classes after apply:', root.classList.toString())
  }

  const setThemeAndPersist = (newTheme: Theme) => {
    console.log('Setting new theme:', newTheme)
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setThemeAndPersist(newTheme)
  }

  return {
    theme,
    isDark,
    mounted,
    setTheme: setThemeAndPersist,
    toggleTheme,
    themes: [
      { key: 'light', label: 'ライト', icon: '☀️' },
      { key: 'dark', label: 'ダーク', icon: '🌙' },
      { key: 'system', label: 'システム', icon: '💻' }
    ] as const
  }
}