'use client';

import { Trophy } from 'lucide-react';
import { UnderlineTabs } from '@/components/shared/AnimatedTabs';
import type { TrendTabType } from '../types';

interface TrendTabsProps {
  activeTab: TrendTabType;
  onTabChange: (tab: TrendTabType) => void;
}

export function TrendTabs({ activeTab, onTabChange }: TrendTabsProps) {
  const tabs = [
    { 
      id: 'recommended' as const, 
      label: 'トレンド',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2"/>
          <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    { 
      id: 'works-ranking' as const, 
      label: '総合作品順位',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    { 
      id: 'users-ranking' as const, 
      label: 'ユーザーランキング',
      icon: <Trophy className="w-5 h-5" />
    },
    { 
      id: 'announcements' as const, 
      label: 'お知らせ',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 11h3l3-7v18l-3-7H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2"/>
          <path d="M13.4 8.6a5 5 0 0 1 0 6.8" stroke="currentColor" strokeWidth="2"/>
          <path d="M16.8 5.2a9 9 0 0 1 0 13.6" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    }
  ];

  return (
    <UnderlineTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      className="mb-6"
      size="md"
      showCounts={false}
    />
  );
}