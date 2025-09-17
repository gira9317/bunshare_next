import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'

export default function WorkNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-gray-400" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            作品が見つかりませんでした
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            指定された作品は存在しないか、削除された可能性があります。
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            ホームに戻る
          </Link>
          
          <Link
            href="/app/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            作品を探す
          </Link>
        </div>
      </div>
    </div>
  )
}