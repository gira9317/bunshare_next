'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Clock, TrendingUp, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_KEYWORDS = [
  '恋愛', '青春', 'ファンタジー', 'ミステリー', 'SF', 
  '日常', '友情', '成長', '冒険', '学園'
];

export function MobileSearchModal({ isOpen, onClose }: MobileSearchModalProps) {
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 検索履歴をローカルストレージから読み込み
  useEffect(() => {
    if (isOpen) {
      const history = localStorage.getItem('bunshare_search_history');
      if (history) {
        setSearchHistory(JSON.parse(history).slice(0, 5)); // 最新5件
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setShowSuggestions(false);
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 検索履歴を保存
  const saveToHistory = (searchTerm: string) => {
    const history = localStorage.getItem('bunshare_search_history');
    let historyArray = history ? JSON.parse(history) : [];
    
    // 重複を削除して先頭に追加
    historyArray = [searchTerm, ...historyArray.filter((item: string) => item !== searchTerm)];
    historyArray = historyArray.slice(0, 10); // 最大10件
    
    localStorage.setItem('bunshare_search_history', JSON.stringify(historyArray));
  };

  // インクリメンタル検索
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    
    if (value.trim().length > 0) {
      // 履歴と人気キーワードから候補を生成
      const allKeywords = [...searchHistory, ...POPULAR_KEYWORDS];
      const filtered = allKeywords
        .filter(keyword => keyword.toLowerCase().includes(value.toLowerCase()))
        .filter((keyword, index, self) => self.indexOf(keyword) === index) // 重複削除
        .slice(0, 8);
      
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [searchHistory]);

  const handleSearch = (searchTerm?: string) => {
    const finalQuery = searchTerm || query;
    if (finalQuery.trim()) {
      saveToHistory(finalQuery.trim());
      window.location.href = `/app/search?q=${encodeURIComponent(finalQuery)}`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('bunshare_search_history');
    setSearchHistory([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 md:hidden">
      {/* 検索ヘッダー */}
      <div className="flex items-center h-14 px-4 border-b border-gray-200 dark:border-gray-700">
        {/* 戻るボタン */}
        <button
          onClick={onClose}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mr-3"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        
        {/* 検索バー */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="作品や作者を検索..."
            className={cn(
              "w-full pl-4 pr-12 py-2.5 bg-gray-50 dark:bg-gray-800", 
              "border border-gray-200 dark:border-gray-700 rounded-full",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
              "text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            )}
            autoFocus
          />
          <button
            onClick={() => handleSearch()}
            disabled={!query.trim()}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2",
              "p-2 rounded-full transition-colors",
              "hover:bg-gray-200 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
      
      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto">
        {showSuggestions ? (
          /* 検索候補 */
          <div className="border-b border-gray-200 dark:border-gray-700">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSearch(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-white truncate">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* 検索履歴と人気キーワード */
          <div className="p-4 space-y-6">
            {/* 検索履歴 */}
            {searchHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    最近の検索
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    クリア
                  </button>
                </div>
                <div className="space-y-1">
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(item)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-900 dark:text-white truncate">{item}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 人気キーワード */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                人気のキーワード
              </h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_KEYWORDS.map((keyword, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(keyword)}
                    className={cn(
                      "px-3 py-2 text-sm rounded-full transition-colors",
                      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                      "hover:bg-purple-100 dark:hover:bg-purple-900/30",
                      "hover:text-purple-700 dark:hover:text-purple-300"
                    )}
                  >
                    #{keyword}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 空の状態 */}
            {searchHistory.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  作品や作者を検索してみましょう
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  検索履歴がここに表示されます
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}