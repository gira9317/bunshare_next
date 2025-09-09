'use client';

import { useState, Suspense, ReactNode } from 'react';
import { TrendTabs } from '../leaf/TrendTabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { TrendTabType } from '../types';

interface TrendPageClientSectionProps {
  className?: string;
  recommendedContent: ReactNode;
  worksRankingContent: ReactNode;
  usersRankingContent: ReactNode;
  announcementsContent: ReactNode;
}

export function TrendPageClientSection({
  className = '',
  recommendedContent,
  worksRankingContent,
  usersRankingContent,
  announcementsContent
}: TrendPageClientSectionProps) {
  const [activeTab, setActiveTab] = useState<TrendTabType>('recommended');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'recommended':
        return recommendedContent;
      case 'works-ranking':
        return worksRankingContent;
      case 'users-ranking':
        return usersRankingContent;
      case 'announcements':
        return announcementsContent;
      default:
        return recommendedContent;
    }
  };

  return (
    <div className={`trend-page-section max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          🔥 トレンド
        </h1>
        
        <TrendTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      </div>

      <Suspense fallback={<LoadingSpinner text="コンテンツを読み込み中..." />}>
        {renderTabContent()}
      </Suspense>
    </div>
  );
}