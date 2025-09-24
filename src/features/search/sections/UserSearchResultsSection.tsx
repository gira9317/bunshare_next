'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Search } from 'lucide-react';
import { UserCard } from '@/features/users/leaf/UserCard';
import { cn } from '@/lib/utils';

interface UserSearchResultsSectionProps {
  query: string;
  sort: string;
  page: number;
}

interface User {
  user_id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string | null;
  followers_count: number;
  following_count?: number;
  works_count: number;
  total_likes: number;
}

type SortType = 'followers' | 'following' | 'works';

export function UserSearchResultsSection({ 
  query, 
  sort, 
  page 
}: UserSearchResultsSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // プリフェッチ用の状態
  const [prefetchedData, setPrefetchedData] = useState<Map<number, User[]>>(new Map());
  const [prefetchingPages, setPrefetchingPages] = useState<Set<number>>(new Set());
  const observerRef = useRef<HTMLDivElement>(null);

  // 初回データ取得 + プリフェッチ
  useEffect(() => {
    loadUsers(true);
    // 初回ロード後に次のページをプリフェッチ
    setTimeout(() => {
      prefetchPage(1);
    }, 500);
  }, [query, sort]);

  // データフェッチ関数（プリフェッチと共通化）
  const fetchUsersData = async (page: number) => {
    const offset = page * 50;
    
    const params = new URLSearchParams({
      q: query,
      sort: sort,
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
    
    if (data.error) {
      throw new Error(data.details || data.error);
    }
    
    return {
      users: data.users || [],
      hasMore: data.hasMore || false
    };
  };

  // プリフェッチ関数
  const prefetchPage = useCallback(async (page: number) => {
    if (prefetchingPages.has(page) || prefetchedData.has(page)) return;
    
    setPrefetchingPages(prev => new Set([...prev, page]));
    
    try {
      const result = await fetchUsersData(page);
      setPrefetchedData(prev => new Map([...prev, [page, result.users]]));
    } catch (error) {
      console.error('Prefetch failed:', error);
    } finally {
      setPrefetchingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(page);
        return newSet;
      });
    }
  }, [query, sort, prefetchingPages, prefetchedData]);

  const loadUsers = async (isInitial: boolean = false) => {
    if (!isInitial && (loadingMore || !hasMore)) return;
    
    const pageToLoad = isInitial ? 0 : currentPage + 1;
    
    if (isInitial) {
      setLoading(true);
      setError(null);
      setUsers([]);
      setCurrentPage(0);
      setHasMore(true);
      // プリフェッチデータをクリア
      setPrefetchedData(new Map());
      setPrefetchingPages(new Set());
    } else {
      setLoadingMore(true);
    }
    
    try {
      let newUsers: User[];
      let hasMoreData: boolean;

      // プリフェッチされたデータがあるかチェック
      if (!isInitial && prefetchedData.has(pageToLoad)) {
        newUsers = prefetchedData.get(pageToLoad)!;
        // プリフェッチデータからは hasMore がわからないので、次のページをプリフェッチして判断
        hasMoreData = newUsers.length === 50;
        console.log(`📦 プリフェッチデータを使用: ページ${pageToLoad}`);
      } else {
        // 通常のフェッチ
        const result = await fetchUsersData(pageToLoad);
        newUsers = result.users;
        hasMoreData = result.hasMore;
      }
      
      if (isInitial) {
        setUsers(newUsers);
      } else {
        // 重複ユーザーを除去して追加
        setUsers(prev => {
          const existingIds = new Set(prev.map(u => u.user_id));
          const uniqueNewUsers = newUsers.filter(user => !existingIds.has(user.user_id));
          return [...prev, ...uniqueNewUsers];
        });
        // 使用済みプリフェッチデータを削除
        setPrefetchedData(prev => {
          const newMap = new Map(prev);
          newMap.delete(pageToLoad);
          return newMap;
        });
      }
      
      setCurrentPage(pageToLoad);
      setHasMore(hasMoreData);
      setError(null);

      // 次のページをプリフェッチ
      if (hasMoreData) {
        setTimeout(() => {
          prefetchPage(pageToLoad + 1);
        }, 100);
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
  };

  const handleSortChange = (newSort: SortType) => {
    // URLを更新して再読み込み
    const params = new URLSearchParams(window.location.search);
    params.set('sort', newSort);
    window.location.search = params.toString();
  };

  // Intersection Observer for automatic prefetching
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !prefetchingPages.has(currentPage + 2)) {
            // ユーザーが下部70%に達したら2ページ先をプリフェッチ
            prefetchPage(currentPage + 2);
          }
        });
      },
      {
        rootMargin: '200px', // 200px手前でトリガー
        threshold: 0.1
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, currentPage, prefetchPage, prefetchingPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ソートオプション */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {[
          { value: 'followers' as const, label: 'フォロワー数順' },
          { value: 'following' as const, label: 'フォロー数順' },
          { value: 'works' as const, label: '作品数順' }
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className={cn(
              "px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
              sort === option.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 結果表示 */}
      {users.length > 0 ? (
        <>
          <div className="flex items-center gap-2 text-gray-600 mb-3 sm:mb-4 justify-center sm:justify-start">
            <Users className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="text-sm sm:text-base">{users.length}人のユーザー</span>
            {hasMore && <span className="text-xs sm:text-sm">（さらに読み込み可能）</span>}
          </div>
          
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  following_count: user.following_count || 0
                }}
                compact={true}
              />
            ))}
          </div>
          
          {/* Intersection Observer の監視ポイント */}
          <div ref={observerRef} className="h-4 w-full" />
          
          {/* もっと見るボタン */}
          {hasMore && (
            <div className="text-center mt-6 sm:mt-8">
              {loadingMore ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-gray-600 text-sm sm:text-base">読み込み中...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => loadUsers()}
                    disabled={loadingMore}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg font-medium w-full sm:w-auto"
                  >
                    もっと見る
                  </button>
                  
                </div>
              )}
            </div>
          )}
          
          {/* エラー表示 */}
          {error && (
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 sm:py-12 px-4">
          <Users className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            ユーザーが見つかりませんでした
          </h3>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
            「{query}」に一致するユーザーはいませんでした。<br className="hidden sm:block" />
            <span className="block sm:inline">別のキーワードで検索してみてください。</span>
          </p>
        </div>
      )}
    </div>
  );
}