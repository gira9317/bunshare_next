import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            &copy; 2025 Bunshare. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link 
              href="/terms" 
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              利用規約
            </Link>
            <Link 
              href="/privacy" 
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              プライバシーポリシー
            </Link>
            <Link 
              href="/help" 
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              ヘルプ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}