import { Suspense } from 'react';
import { TrendPageSection } from '@/features/trends/sections/TrendPageSection';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// 静的生成に変更（認証不要のトレンドページ）
export const revalidate = 300 // 5分ごとに再生成

export default function TrendsPage() {
  return (
    <div className="trends-page">
      <Suspense fallback={<LoadingSpinner text="トレンドを読み込み中..." />}>
        <TrendPageSection />
      </Suspense>
    </div>
  );
}