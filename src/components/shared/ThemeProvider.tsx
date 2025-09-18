'use client'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // テーマ設定はThemeScriptとuseDarkModeで管理するため、
  // 重複ロジックを削除してシンプルなラッパーとして機能
  return <>{children}</>
}