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
    <div className="related-searches mt-8 p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5" />
        関連する検索
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {relatedSearches.map((tag, index) => (
          <Link
            key={index}
            href={`/app/search?q=${encodeURIComponent(tag)}`}
            className="inline-flex items-center px-3 py-1.5 bg-white text-gray-700 rounded-full border border-gray-200 hover:bg-gray-600 hover:border-blue-400 hovertext-blue-300 transition-colors text-sm"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}