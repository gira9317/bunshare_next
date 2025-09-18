'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchFilters } from '../types';

interface ResultsPaginationProps {
  currentPage: number;
  totalResults: number;
  hasMore: boolean;
  query: string;
  filters: SearchFilters;
  resultsPerPage?: number;
}

export function ResultsPagination({ 
  currentPage, 
  totalResults, 
  hasMore,
  query,
  filters,
  resultsPerPage = 12 
}: ResultsPaginationProps) {
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('q', query);
    
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.sort !== 'relevance') params.set('sort', filters.sort);
    if (filters.rating !== 'all') params.set('rating', filters.rating);
    if (page > 1) params.set('page', page.toString());
    
    return `/search?${params.toString()}`;
  };

  // 表示するページ番号の範囲を計算
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    // 端の調整
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const showPrevious = currentPage > 1;
  const showNext = hasMore || currentPage < totalPages;

  return (
    <div className="results-pagination mt-8 flex items-center justify-center">
      <nav className="flex items-center gap-2">
        {/* 前のページ */}
        {showPrevious ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="pagination-btn flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">前へ</span>
          </Link>
        ) : (
          <button
            disabled
            className="pagination-btn flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">前へ</span>
          </button>
        )}

        {/* ページ番号 */}
        <div className="flex items-center gap-1">
          {pageNumbers[0] > 1 && (
            <>
              <Link
                href={createPageUrl(1)}
                className="pagination-number w-10 h-10 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                1
              </Link>
              {pageNumbers[0] > 2 && (
                <span className="text-gray-400 px-1">...</span>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <Link
              key={page}
              href={createPageUrl(page)}
              className={`pagination-number w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page}
            </Link>
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="text-gray-400 px-1">...</span>
              )}
              <Link
                href={createPageUrl(totalPages)}
                className="pagination-number w-10 h-10 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {totalPages}
              </Link>
            </>
          )}
        </div>

        {/* 次のページ */}
        {showNext ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="pagination-btn flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="hidden sm:inline">次へ</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            disabled
            className="pagination-btn flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            <span className="hidden sm:inline">次へ</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </nav>

      {/* 結果情報 */}
      <div className="hidden sm:block ml-6 text-sm text-gray-600">
        {totalResults > 0 && (
          <>
            {Math.min((currentPage - 1) * resultsPerPage + 1, totalResults)} - {Math.min(currentPage * resultsPerPage, totalResults)} / {totalResults}件
          </>
        )}
      </div>
    </div>
  );
}