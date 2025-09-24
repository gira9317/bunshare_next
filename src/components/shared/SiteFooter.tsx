import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="backdrop-blur-sm"
    style={{
      borderTopColor: 'var(--border-primary)',
      borderTopWidth: '1px',
      backgroundColor: 'var(--bg-primary)',
      opacity: '0.9'
    }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            &copy; 2025 Bunshare. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link 
              href="/terms" 
              className="hover:opacity-70 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              利用規約
            </Link>
            <Link 
              href="/privacy" 
              className="hover:opacity-70 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              プライバシーポリシー
            </Link>
            <Link 
              href="/app/help" 
              className="hover:opacity-70 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              ヘルプ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}