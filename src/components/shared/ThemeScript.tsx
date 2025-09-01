export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('theme') || 'system'
        const root = document.documentElement
        
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else if (theme === 'system') {
          const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          if (systemIsDark) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      } catch (e) {
        // フォールバック: システム設定を使用
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark')
        }
      }
    })()
  `

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  )
}