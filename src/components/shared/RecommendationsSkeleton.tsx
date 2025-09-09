export function RecommendationsSkeleton() {
  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-6 w-24 bg-gray-100 dark:bg-gray-600 rounded-full animate-pulse" />
      </div>
      
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-5 xl:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* 画像プレースホルダー */}
            <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            
            {/* コンテンツプレースホルダー */}
            <div className="p-4 space-y-3">
              {/* タイトル */}
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              
              {/* 作者とカテゴリ */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 dark:bg-gray-600 rounded-full animate-pulse" />
              </div>
              
              {/* 説明 */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
              </div>
              
              {/* 統計情報 */}
              <div className="flex items-center gap-4 pt-2">
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* もっと表示するボタンのプレースホルダー */}
      <div className="mt-6 text-center">
        <div className="h-10 w-48 bg-gray-100 dark:bg-gray-600 rounded-lg animate-pulse mx-auto" />
      </div>
    </section>
  )
}