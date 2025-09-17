'use client';

import Link from 'next/link';
import { Tag } from 'lucide-react';

interface RelatedSearchesProps {
  currentQuery: string;
  tags?: string[];
}

export function RelatedSearches({ currentQuery, tags = [] }: RelatedSearchesProps) {
  // タグから関連検索を生成
  const relatedSearches = tags.slice(0, 8);
  
  if (relatedSearches.length === 0) {
    return null;
  }

  return (
    <div className="related-searches mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5" />
        関連する検索
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {relatedSearches.map((tag, index) => (
          <Link
            key={index}
            href={`/app/search?q=${encodeURIComponent(tag)}`}
            className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}