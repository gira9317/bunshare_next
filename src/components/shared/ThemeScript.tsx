export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function setTheme() {
              try {
                const theme = localStorage.getItem('theme') || 'light'
                const root = document.documentElement
                
                if (theme === 'dark') {
                  root.classList.add('dark')
                } else if (theme === 'light') {
                  root.classList.remove('dark')
                } else if (theme === 'system') {
                  // システムモード（ユーザーが明示的に選択した場合のみ）
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  root.classList.toggle('dark', isDark)
                }
              } catch (e) {
                // Fallback - デフォルトはライトテーマ
                try {
                  const root = document.documentElement
                  root.classList.remove('dark')
                } catch (err) {
                  // Complete fallback - do nothing
                }
              }
            }
            setTheme()
          })()
        `
      }}
      suppressHydrationWarning
    />
  )
}