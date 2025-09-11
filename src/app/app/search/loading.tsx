import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function SearchLoadingPage() {
  return (
    <div className="search-loading-container">
      <div className="search-header-skeleton">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-64"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
      
      <div className="search-filters-skeleton mb-8">
        <div className="animate-pulse">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="search-results-skeleton">
        <LoadingSpinner />
        <p className="text-center mt-4 text-gray-600 dark:text-gray-400">検索中...</p>
      </div>
    </div>
  );
}