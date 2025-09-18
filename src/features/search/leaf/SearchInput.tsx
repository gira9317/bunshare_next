'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchSuggestions } from './SearchSuggestions';

interface SearchInputProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showSuggestions?: boolean;
}

export function SearchInput({ 
  initialQuery = '', 
  placeholder = '作品や作者を検索...', 
  className,
  autoFocus = false,
  showSuggestions = true
}: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 外部クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestionsPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestionsPanel(false);
      router.push(`/app/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestionsPanel(false);
    router.push(`/app/search?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)} ref={containerRef}>
      <div className={cn(
        "flex items-center bg-white border rounded-lg transition-all duration-200",
        isFocused 
          ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-20" 
          : "border-gray-300 hover:border-gray-500"
      )}>
        <div className="pl-3 flex items-center">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (showSuggestions) setShowSuggestionsPanel(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (showSuggestions) setShowSuggestionsPanel(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 px-3 py-3 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-gray-400 hovertext-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button
          type="submit"
          disabled={!query.trim()}
          className={cn(
            "px-4 py-3 text-sm font-medium rounded-r-lg transition-colors",
            query.trim()
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          検索
        </button>
      </div>
      
      {showSuggestions && (
        <SearchSuggestions
          query={query}
          isVisible={showSuggestionsPanel}
          onSelect={handleSuggestionSelect}
        />
      )}
    </form>
  );
}