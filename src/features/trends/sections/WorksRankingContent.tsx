'use client';

import { useState } from 'react';
import { WorkCard } from '@/components/domain/WorkCard';
import { Trophy, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type RankingPeriod = 'all' | 'monthly' | 'weekly' | 'daily';

interface RankingData {
  period: RankingPeriod;
  title: string;
  criterion: string;
  icon: React.ReactNode;
  color: string;
  works: any[];
}

interface WorksRankingContentProps {
  initialRankings: RankingData[];
}

export function WorksRankingContent({ initialRankings }: WorksRankingContentProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<RankingPeriod>>(new Set());

  const toggleExpanded = (period: RankingPeriod) => {
    setExpandedPeriods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(period)) {
        newSet.delete(period);
      } else {
        newSet.add(period);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-8">
      {initialRankings.map((ranking) => {
        const isExpanded = expandedPeriods.has(ranking.period);
        const displayWorks = isExpanded ? ranking.works : ranking.works.slice(0, 3);
        
        return (
          <div key={ranking.period} className="ranking-section">
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {ranking.title}ランキング
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {ranking.criterion}
                  </p>
                </div>
              </div>
              
              {ranking.works.length > 3 && (
                <button
                  onClick={() => toggleExpanded(ranking.period)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                    "text-sm font-medium text-gray-700 dark:text-gray-300",
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

            {/* 作品グリッド */}
            {displayWorks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayWorks.map((work, index) => {
                  const displayRank = index + 1;
                  
                  return (
                    <div key={work.work_id} className="relative">
                      {/* ランクバッジ */}
                      <div className={cn(
                        "absolute -top-3 -left-3 z-20 text-white text-sm font-bold",
                        "px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1",
                        "bg-gradient-to-r transform -rotate-6 hover:rotate-0 transition-transform",
                        ranking.color
                      )}>
                        <Trophy className="w-4 h-4" />
                        <span>#{displayRank}</span>
                      </div>
                      
                      {/* WorkCardコンポーネント */}
                      <WorkCard 
                        work={work}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">
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