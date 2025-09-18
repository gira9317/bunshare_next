'use client';

import { useState } from 'react';
import { UserCard } from '@/features/users/leaf/UserCard';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type RankingCategory = 'posts' | 'likes' | 'views' | 'followers' | 'newcomers' | 'interactions';

interface RankingData {
  category: RankingCategory;
  title: string;
  criterion: string;
  icon: React.ReactNode;
  color: string;
  users: any[];
}

interface UsersRankingContentProps {
  initialRankings: RankingData[];
}

export function UsersRankingContent({ initialRankings }: UsersRankingContentProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<RankingCategory>>(new Set());

  const toggleExpanded = (category: RankingCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-8">
      {initialRankings.map((ranking) => {
        const isExpanded = expandedCategories.has(ranking.category);
        const displayUsers = isExpanded ? ranking.users : ranking.users.slice(0, 3);
        
        return (
          <div key={ranking.category} className="ranking-section">
            {/* セクションヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-r text-white",
                  ranking.color
                )}>
                  {ranking.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {ranking.title}ランキング
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {ranking.criterion}
                  </p>
                </div>
              </div>
              
              {ranking.users.length > 3 && (
                <button
                  onClick={() => toggleExpanded(ranking.category)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-gray-100 hover:bg-gray-50",
                    "text-sm font-medium text-gray-700",
                    "transition-all duration-200"
                  )}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      閉じる
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      もっと見る
                    </>
                  )}
                </button>
              )}
            </div>

            {/* ユーザーグリッド */}
            {displayUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayUsers.map((user, index) => {
                  const displayRank = index + 1;
                  
                  return (
                    <div key={user.id} className="relative">
                      {/* ランクバッジ */}
                      <div className={cn(
                        "absolute -top-4 -left-4 z-20 text-white text-sm font-bold",
                        "px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1",
                        "bg-gradient-to-r transform -rotate-12 hover:rotate-0 transition-transform",
                        ranking.color
                      )}>
                        <Trophy className="w-4 h-4" />
                        <span>#{displayRank}</span>
                      </div>
                      
                      {/* UserCardコンポーネント */}
                      <UserCard 
                        user={user}
                        compact={true}
                        className="min-h-[6rem]"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  {ranking.title}のランキングデータがありません
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}