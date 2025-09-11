import { Suspense } from 'react';
import { SearchHeaderSection } from '@/features/search/sections/SearchHeaderSection';
import { SearchFiltersSection } from '@/features/search/sections/SearchFiltersSection';
import { SearchResultsSection } from '@/features/search/sections/SearchResultsSection';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    sort?: string;
    type?: string;
    page?: string;
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const filters = {
    category: searchParams.category || 'all',
    sort: searchParams.sort || 'relevance',
    type: (searchParams.type as 'all' | 'works' | 'users') || 'all'
  };
  const currentPage = parseInt(searchParams.page || '1', 10);

  return (
    <div className="search-page-container">
      <Suspense fallback={<LoadingSpinner />}>
        <SearchHeaderSection query={query} />
      </Suspense>
      
      <Suspense fallback={<div className="h-20" />}>
        <SearchFiltersSection filters={filters} />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <SearchResultsSection 
          query={query}
          filters={filters}
          page={currentPage}
        />
      </Suspense>
    </div>
  );
}