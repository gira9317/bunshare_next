'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { UserCard } from '@/features/users/leaf/UserCard';
import { cn } from '@/lib/utils';

interface UserCarouselProps {
  users: Array<{
    user_id: string;
    username: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string | null;
    followers_count: number;
    works_count: number;
    total_likes: number;
  }>;
  onShowMore?: () => void;
  className?: string;
}

export function UserCarousel({ users, onShowMore, className }: UserCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftButton(scrollLeft > 0);
    setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [users]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cardWidth = 280; // UserCardの幅 + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={cn("user-carousel-container relative", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4" />
          ユーザー
        </h3>
        {users.length > 3 && onShowMore && (
          <button
            onClick={onShowMore}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            もっと見る →
          </button>
        )}
      </div>
      
      <div className="relative">
        {/* 左スクロールボタン */}
        {showLeftButton && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="前へ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        
        {/* カルーセルコンテナ */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {users.map((user) => (
            <div
              key={user.user_id}
              className="flex-none w-[260px] sm:w-[280px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <UserCard
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
                compact={true}
              />
            </div>
          ))}
        </div>
        
        {/* 右スクロールボタン */}
        {showRightButton && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="次へ"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      
    </div>
  );
}