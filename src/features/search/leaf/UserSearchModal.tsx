'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Users, TrendingUp, UserPlus } from 'lucide-react';
import { UserCard } from '@/features/users/leaf/UserCard';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUsers?: Array<{
    user_id: string;
    username: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string | null;
    followers_count: number;
    following_count?: number;
    works_count: number;
    total_likes: number;
  }>;
  searchQuery?: string;
}

type SortType = 'followers' | 'following' | 'works';

export function UserSearchModal({ 
  isOpen, 
  onClose, 
  initialUsers = [],
  searchQuery = ''
}: UserSearchModalProps) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('followers');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsers(initialUsers);
      setShowResults(initialUsers.length > 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialUsers]);

  // 初期結果から絞り込み
  const filterUsers = useCallback((searchTerm: string, sortType: SortType) => {
    let filtered = initialUsers;
    
    if (searchTerm.trim()) {
      const lowercaseQuery = searchTerm.toLowerCase();
      filtered = initialUsers.filter(user => 
        (user.username?.toLowerCase() || '').includes(lowercaseQuery) ||
        (user.display_name?.toLowerCase() || '').includes(lowercaseQuery) ||
        (user.bio?.toLowerCase() || '').includes(lowercaseQuery)
      );
    }
    
    // ソート
    const sorted = [...filtered].sort((a, b) => {
      switch (sortType) {
        case 'followers':
          return b.followers_count - a.followers_count;
        case 'following':
          return (b.following_count || 0) - (a.following_count || 0);
        case 'works':
          return b.works_count - a.works_count;
        default:
          return 0;
      }
    });
    
    setUsers(sorted);
    setShowResults(true);
  }, [initialUsers]);

  useEffect(() => {
    filterUsers(query, sortBy);
  }, [query, sortBy, filterUsers]);

  const handleSortChange = (newSort: SortType) => {
    setSortBy(newSort);
    // filterUsers関数で自動的に再ソートされる
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 transition-opacity"
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div className="absolute inset-x-0 bottom-0 h-[90vh] sm:inset-y-4 sm:inset-x-4 sm:h-auto sm:max-h-[80vh] sm:max-w-3xl sm:mx-auto sm:my-auto">
        <div className="h-full bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col">
          {/* ヘッダー */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                検索結果内のユーザー
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 検索バー */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="結果内のユーザーを絞り込み..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* ソートオプション */}
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {[
                { value: 'followers' as const, label: 'フォロワー数順' },
                { value: 'following' as const, label: 'フォロー数順' },
                { value: 'works' as const, label: '作品数順' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
                    sortBy === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : showResults ? (
              users.length > 0 ? (
                <div className="grid gap-3">
                  {users.map((user) => (
                    <UserCard
                      key={user.user_id}
                      user={{
                        id: user.user_id,
                        username: user.username,
                        custom_user_id: null,
                        avatar_img_url: user.avatar_url,
                        bio: user.bio,
                        works_count: user.works_count,
                        followers_count: user.followers_count,
                        following_count: 0
                      }}
                      compact={false}
                      onUserClick={() => {
                        window.location.href = `/users/${user.user_id}`;
                        onClose();
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    ユーザーが見つかりませんでした
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  検索結果からユーザーを絞り込めます
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}