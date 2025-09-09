'use client';

import { cn } from '@/lib/utils';
import type { TrendTabType } from '../types';

interface TrendTabsProps {
  activeTab: TrendTabType;
  onTabChange: (tab: TrendTabType) => void;
}

export function TrendTabs({ activeTab, onTabChange }: TrendTabsProps) {
  const tabs = [
    { 
      id: 'recommended' as const, 
      label: 'おすすめ',
      icon: '⭐'
    },
    { 
      id: 'works-ranking' as const, 
      label: '総合作品順位',
      icon: '📊'
    },
    { 
      id: 'users-ranking' as const, 
      label: 'ユーザーランキング',
      icon: '👑'
    },
    { 
      id: 'announcements' as const, 
      label: 'お知らせ',
      icon: '📢'
    }
  ];

  return (
    <div className="trend-tabs border-b border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-all duration-200",
              "border-b-2 hover:bg-gray-50 dark:hover:bg-gray-800/50",
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}