'use client';

import { cn } from '@/lib/utils';

export type SearchTabType = 'all' | 'works' | 'users';

interface SearchTabsProps {
  activeTab: SearchTabType;
  onTabChange: (tab: SearchTabType) => void;
  workCount?: number;
  userCount?: number;
}

export function SearchTabs({ 
  activeTab, 
  onTabChange,
  workCount,
  userCount
}: SearchTabsProps) {
  const tabs = [
    { 
      id: 'all' as const, 
      label: 'すべて',
      count: undefined
    },
    { 
      id: 'works' as const, 
      label: '作品',
      count: workCount
    },
    { 
      id: 'users' as const, 
      label: 'ユーザー',
      count: userCount
    }
  ];

  return (
    <div className="search-tabs border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-1 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs",
                activeTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}