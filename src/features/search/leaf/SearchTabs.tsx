'use client';

import { PillTabs } from '@/components/shared/AnimatedTabs';

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
      label: 'すべて'
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
    <PillTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      size="md"
      showCounts={true}
      scrollable={false}
    />
  );
}