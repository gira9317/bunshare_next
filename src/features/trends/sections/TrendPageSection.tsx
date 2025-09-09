import { Suspense } from 'react';
import { TrendPageClientSection } from './TrendPageClientSection';
import { TrendHeroSection } from './TrendHeroSection';
import { TrendingWorksSection } from './TrendingWorksSection';
import { TrendTagsSection } from './TrendTagsSection';
import { WorksRankingSection } from './WorksRankingSection';
import { UsersRankingSection } from './UsersRankingSection';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface TrendPageSectionProps {
  className?: string;
}

function RecommendedContent() {
  return (
    <div className="space-y-8">
      <TrendHeroSection />
      <TrendingWorksSection />
      <TrendTagsSection />
    </div>
  );
}

function WorksRankingContent() {
  return (
    <div className="space-y-8">
      <WorksRankingSection />
    </div>
  );
}

function UsersRankingContent() {
  return (
    <div className="space-y-8">
      <UsersRankingSection />
    </div>
  );
}

function AnnouncementsContent() {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📢 お知らせ・アップデート情報
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          最新のアップデート情報を表示（実装予定）
        </p>
      </div>
    </div>
  );
}

export function TrendPageSection({ className = '' }: TrendPageSectionProps) {
  return (
    <TrendPageClientSection 
      className={className}
      recommendedContent={<RecommendedContent />}
      worksRankingContent={<WorksRankingContent />}
      usersRankingContent={<UsersRankingContent />}
      announcementsContent={<AnnouncementsContent />}
    />
  );
}