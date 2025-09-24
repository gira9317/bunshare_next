'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // ページネーション用の状態
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // APIからデータを取得する関数
  const loadMoreUsers = useCallback(async (searchTerm: string = '', isInitial: boolean = false) => {
    if (loadingMore && !isInitial) return;
    if (!hasMore && !isInitial) return;
    
    const currentPage = isInitial ? 0 : page + 1;
    const offset = currentPage * 50;
    
    // スクロール位置を保存（追加データロード時のみ）
    const savedScrollTop = !isInitial && scrollContainerRef.current ? scrollContainerRef.current.scrollTop : 0;
    
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        sort: sortBy,
        limit: '50',
        offset: offset.toString()
      });
      
      const response = await fetch(`/api/users/search?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`検索に失敗しました: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      // エラーレスポンスの場合
      if (data.error) {
        throw new Error(data.details || data.error);
      }
      
      if (isInitial) {
        setUsers(data.users || []);
        setShowResults(true);
      } else {
        setUsers(prev => [...prev, ...(data.users || [])]);
      }
      
      setPage(currentPage);
      setHasMore(data.hasMore || false);
      setError(null);
      
      // スクロール位置を復元（追加データロード時のみ）
      if (!isInitial && scrollContainerRef.current && savedScrollTop > 0) {
        // 少し遅延させてDOMが更新されるのを待つ
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = savedScrollTop;
          }
        }, 10);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('ユーザーの読み込みに失敗しました');
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [searchQuery, sortBy, page, loadingMore, hasMore]);
  
  // 初期結果から絞り込み（ローカルフィルタリング）
  const filterUsers = useCallback((searchTerm: string, sortType: SortType) => {
    let filtered = users;
    
    if (searchTerm.trim()) {
      const lowercaseQuery = searchTerm.toLowerCase();
      filtered = users.filter(user => 
        (user.username?.toLowerCase() || '').includes(lowercaseQuery) ||
        (user.display_name?.toLowerCase() || '').includes(lowercaseQuery) ||
        (user.bio?.toLowerCase() || '').includes(lowercaseQuery)
      );
    }
    
    // ソート（APIから既にソートされているが、ローカル検索時は再ソート）
    if (searchTerm.trim()) {
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
      
      return sorted;
    }
    
    return filtered;
  }, [users]);

  useEffect(() => {
    if (isOpen) {
      // 初回表示時はAPIからデータを取得
      if (searchQuery) {
        loadMoreUsers('', true);
      } else {
        // 初期データをそのまま使用
        setUsers(initialUsers);
        setShowResults(true);
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, searchQuery, loadMoreUsers, initialUsers]);
  
  // ローカル検索用のデバウンス関数
  const debouncedLocalFilter = useCallback(
    debounce((searchTerm: string, sortType: SortType) => {
      const filtered = filterUsers(searchTerm, sortType);
      setUsers(filtered);
    }, 150),
    [filterUsers]
  );
  
  useEffect(() => {
    if (query.trim()) {
      debouncedLocalFilter(query, sortBy);
    } else {
      // 検索クエリがない場合は全ユーザーを表示
      const filtered = filterUsers('', sortBy);
      setUsers(filtered);
    }
  }, [query, sortBy, debouncedLocalFilter, filterUsers]);

  const handleSortChange = (newSort: SortType) => {
    setSortBy(newSort);
    // データをリセットして新しいソート順で再取得
    setPage(0);
    setHasMore(true);
    if (searchQuery) {
      loadMoreUsers('', true);
    }
  };
  

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] bg-black/50 backdrop-blur-sm">
      {/* オーバーレイ */}
      <div 
        className="fixed top-0 left-0 right-0 bottom-0 z-[9998]"
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div className="fixed inset-x-0 bottom-0 h-[90vh] sm:inset-6 sm:h-[90vh] sm:max-w-4xl sm:mx-auto z-[9999]">
        <div className="h-full bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col">
          {/* ヘッダー */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                検索結果内のユーザー
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
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
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      ? "bg-blue-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-50"
                  )}
                  style={sortBy === option.value ? { color: 'white' } : {}}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* コンテンツ */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : showResults ? (
              users.length > 0 ? (
                <>
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
                          window.location.href = `/app/profile/${user.user_id}`;
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* もっと見るボタン */}
                  {hasMore && !query.trim() && (
                    <div className="text-center mt-6">
                      {loadingMore ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-gray-600">読み込み中...</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => loadMoreUsers()}
                          disabled={loadingMore}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          もっと見る
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* エラー表示 */}
                  {error && (
                    <div className="text-center mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    ユーザーが見つかりませんでした
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
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