'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchSuggestionsProps {
  query: string;
  isVisible: boolean;
  onSelect: (suggestion: string) => void;
  className?: string;
}

interface Suggestion {
  text: string;
  type: 'history' | 'trending' | 'autocomplete';
  count?: number;
}

export function SearchSuggestions({ 
  query, 
  isVisible, 
  onSelect,
  className 
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isVisible) {
      setSelectedIndex(-1);
      return;
    }

    // 検索履歴を取得
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]')
      .slice(0, 3)
      .map((text: string) => ({ text, type: 'history' as const }));

    // トレンド検索（仮のデータ）
    const trending = [
      { text: '恋愛小説', type: 'trending' as const, count: 523 },
      { text: 'ファンタジー', type: 'trending' as const, count: 412 },
      { text: '短編集', type: 'trending' as const, count: 389 }
    ];

    // クエリに基づく自動補完（仮の実装）
    const autocomplete = query ? [
      { text: `${query} 小説`, type: 'autocomplete' as const },
      { text: `${query} エッセイ`, type: 'autocomplete' as const },
      { text: `${query} 詩`, type: 'autocomplete' as const }
    ].filter(s => s.text !== query) : [];

    // 結合してセット
    if (query) {
      setSuggestions([...autocomplete, ...searchHistory]);
    } else {
      setSuggestions([...searchHistory, ...trending]);
    }
  }, [query, isVisible]);

  // キーボード操作
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex].text);
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, suggestions]);

  const handleSelect = (text: string) => {
    // 検索履歴に追加
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const newHistory = [text, ...history.filter((h: string) => h !== text)].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));

    onSelect(text);
    setSelectedIndex(-1);
  };

  const getIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'history':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'autocomplete':
        return <Search className="w-4 h-4 text-blue-500" />;
    }
  };

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      ref={suggestionsRef}
      className={cn(
        "absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50",
        className
      )}
    >
      <div className="py-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.type}-${suggestion.text}`}
            onClick={() => handleSelect(suggestion.text)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              "w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left",
              selectedIndex === index && "bg-gray-50 dark:bg-gray-700"
            )}
          >
            {getIcon(suggestion.type)}
            <span className="flex-1 text-gray-900 dark:text-white">
              {suggestion.text}
            </span>
            {suggestion.count && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {suggestion.count}件
              </span>
            )}
          </button>
        ))}
      </div>
      
      {!query && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <button
            onClick={() => router.push('/search/advanced')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            詳細検索 →
          </button>
        </div>
      )}
    </div>
  );
}