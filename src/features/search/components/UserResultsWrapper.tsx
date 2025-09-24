'use client';

import { useState } from 'react';
import { UserCard } from '@/features/users/leaf/UserCard';
import { UserCarousel } from '../leaf/UserCarousel';

interface UserResultsWrapperProps {
  users: Array<{
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
  searchType: string;
  query: string;
  totalCount: number;
  onShowModal: () => void;
}

export function UserResultsWrapper({ 
  users, 
  searchType,
  query,
  totalCount 
}: Omit<UserResultsWrapperProps, 'onShowModal'>) {

  // モバイルビューかどうかを判定（本来はuseMediaQueryを使うべきだが、簡単のため）
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const handleShowModal = () => {
    if (typeof window !== 'undefined' && (window as any).openUserSearchModal) {
      (window as any).openUserSearchModal(users, query)
    }
  }

  // 常に6人まで表示（全体検索のため）
  const displayUsers = users.slice(0, 6);

  return (
    <>
      <section className="authors-section">
        {/* デスクトップ表示 */}
        <div className="hidden sm:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              作者 ({totalCount}人)
            </h2>
            {users.length > 6 && (
              <button
                onClick={handleShowModal}
                className="text-blue-600 hovertext-blue-300 font-medium text-sm transition-colors"
              >
                もっと見る ({users.length}人)
              </button>
            )}
          </div>
          
          <div className="authors-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayUsers.map((author) => (
              <UserCard
                key={author.user_id}
                user={{
                  id: author.user_id,
                  username: author.username,
                  custom_user_id: null,
                  avatar_img_url: author.avatar_url || null,
                  bio: author.bio,
                  works_count: author.works_count,
                  followers_count: author.followers_count,
                  following_count: author.following_count || 0
                }}
                compact={true}
              />
            ))}
          </div>
        </div>

        {/* モバイル表示（カルーセル） */}
        <div className="block sm:hidden">
          <UserCarousel
            users={users}
            onShowMore={handleShowModal}
          />
        </div>
      </section>
    </>
  );
}