import { Suspense } from 'react';
import { TrendPageSection } from '@/features/trends/sections/TrendPageSection';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function TrendsPage() {
  return (
    <div className="trends-page">
      <Suspense fallback={<LoadingSpinner text="トレンドを読み込み中..." />}>
        <TrendPageSection />
      </Suspense>
    </div>
  );
}