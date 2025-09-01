export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function setTheme() {
              try {
                const theme = localStorage.getItem('theme') || 'system'
                const root = document.documentElement
                
                if (theme === 'dark') {
                  root.classList.add('dark')
                } else if (theme === 'light') {
                  root.classList.remove('dark')
                } else {
                  // system
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  root.classList.toggle('dark', isDark)
                }
              } catch (e) {
                // Fallback to system preference
                try {
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  document.documentElement.classList.toggle('dark', isDark)
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