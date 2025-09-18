import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SearchHeaderSectionProps {
  query: string;
  totalResults?: number;
}

export function SearchHeaderSection({ query, totalResults }: SearchHeaderSectionProps) {
  return (
    <div className="search-header-section mb-6">
      <div className="flex items-center justify-between">
        <div className="search-info">
          <div className="flex items-center gap-4 mb-2">
            <Link 
              href="/app"
              className="flex items-center gap-2 text-gray-600 hovertext-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">戻る</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="text-blue-600">"{query}"</span>の検索結果
            </h1>
          </div>
          {totalResults !== undefined && (
            <p className="text-gray-600">
              {totalResults}件の結果が見つかりました
            </p>
          )}
        </div>
      </div>
    </div>
  );
}