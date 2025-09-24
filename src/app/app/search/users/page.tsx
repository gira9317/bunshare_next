import { Suspense } from 'react';
import { UserSearchResultsSection } from '@/features/search/sections/UserSearchResultsSection';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface UserSearchPageProps {
  searchParams: {
    q?: string;
    sort?: string;
    page?: string;
  };
}

export default function UserSearchPage({ searchParams }: UserSearchPageProps) {
  const query = searchParams.q || '';
  const sort = searchParams.sort || 'followers';
  const currentPage = parseInt(searchParams.page || '1', 10);

  if (!query.trim()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ユーザー検索</h1>
          <p className="text-gray-500">
            検索キーワードを入力してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          「{query}」のユーザー検索結果
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          検索条件に一致するユーザーを表示しています
        </p>
      </div>
      
      <Suspense fallback={<LoadingSpinner />}>
        <UserSearchResultsSection 
          query={query}
          sort={sort}
          page={currentPage}
        />
      </Suspense>
    </div>
  );
}