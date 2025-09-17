import { Suspense } from 'react';
import { TrendPageSection } from '@/features/trends/sections/TrendPageSection';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// 動的レンダリングを強制（認証とクッキーを使用するため）
export const dynamic = 'force-dynamic'

export default function TrendsPage() {
  return (
    <div className="trends-page">
      <Suspense fallback={<LoadingSpinner text="トレンドを読み込み中..." />}>
        <TrendPageSection />
      </Suspense>
    </div>
  );
}