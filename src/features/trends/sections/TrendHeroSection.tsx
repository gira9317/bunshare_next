import { Suspense } from 'react';
import { getHeroBanners } from '../server/loader';
import { HeroBanner } from '../leaf/HeroBanner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface TrendHeroSectionProps {
  className?: string;
}

async function HeroBannerContent() {
  const startTime = Date.now()
  console.log('[TRENDS HERO] バナー取得開始')
  
  const banners = await getHeroBanners();
  
  const endTime = Date.now()
  console.log(`[TRENDS HERO] バナー取得完了: ${endTime - startTime}ms`)
  
  if (banners.length === 0) {
    return (
      <div className="hero-placeholder bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          🔥 今日のトレンド
        </h2>
        <p className="text-lg opacity-90">
          注目の作品やクリエイターをチェックしよう
        </p>
      </div>
    );
  }

  // 最も優先度の高いバナーを表示
  const activeBanner = banners[0];
  
  return <HeroBanner banner={activeBanner} />;
}

export function TrendHeroSection({ className = '' }: TrendHeroSectionProps) {
  return (
    <section className={`trend-hero-section ${className}`}>
      <Suspense fallback={
        <div className="hero-skeleton bg-gray-200 rounded-xl animate-pulse" 
             style={{ aspectRatio: '16/6' }}>
          <LoadingSpinner className="h-full" />
        </div>
      }>
        <HeroBannerContent />
      </Suspense>
    </section>
  );
}