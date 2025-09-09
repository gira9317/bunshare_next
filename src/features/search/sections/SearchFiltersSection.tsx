'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterChips } from '../leaf/FilterChips';
import { SearchFilters } from '../types';

interface SearchFiltersSectionProps {
  filters: SearchFilters;
}

export function SearchFiltersSection({ filters }: SearchFiltersSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    if (value === 'all' || value === 'relevance') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    
    // ページをリセット
    newParams.delete('page');

    startTransition(() => {
      router.push(`/search?${newParams.toString()}`);
    });
  };

  const categoryOptions = [
    { value: 'all', label: 'すべて' },
    { value: '小説', label: '小説' },
    { value: '詩', label: '詩' },
    { value: 'エッセイ', label: 'エッセイ' }
  ];

  const sortOptions = [
    { value: 'relevance', label: '関連度順' },
    { value: 'popular_today', label: '今日の人気' },
    { value: 'popular_week', label: '今週の人気' },
    { value: 'popular_month', label: '今月の人気' },
    { value: 'popular_all', label: '全期間人気' },
    { value: 'likes', label: 'いいね順' },
    { value: 'newest', label: '新しい順' },
    { value: 'oldest', label: '古い順' }
  ];


  return (
    <div className="search-filters-section mb-6">

      {/* デスクトップフィルター */}
      <div className="hidden lg:block">
        <div className="space-y-4">
          <div className="filter-section">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              カテゴリ
            </h3>
            <FilterChips
              options={categoryOptions}
              value={filters.category}
              onChange={(value) => handleFilterChange('category', value)}
              disabled={isPending}
            />
          </div>

          <div className="filter-section">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              並び順
            </h3>
            <FilterChips
              options={sortOptions}
              value={filters.sort}
              onChange={(value) => handleFilterChange('sort', value)}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* モバイルフィルター */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium"
            disabled={isPending}
          >
            <span>フィルター</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
          </button>
          
          <div className="flex gap-2 overflow-x-auto">
            <FilterChips
              options={categoryOptions}
              value={filters.category}
              onChange={(value) => handleFilterChange('category', value)}
              disabled={isPending}
              size="sm"
            />
          </div>
        </div>

        {/* モバイル展開フィルター */}
        {showMobileFilters && (
          <div className="mobile-filters p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                並び順
              </h4>
              <FilterChips
                options={sortOptions}
                value={filters.sort}
                onChange={(value) => handleFilterChange('sort', value)}
                disabled={isPending}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>
      
      {isPending && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          フィルターを適用中...
        </div>
      )}
    </div>
  );
}