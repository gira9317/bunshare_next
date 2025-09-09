import { Suspense } from 'react';
import { getTrendingWorks } from '../server/loader';
import { WorkCard } from '@/components/domain/WorkCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TrendingUp } from 'lucide-react';

interface TrendingWorksSectionProps {
  className?: string;
}

async function TrendingWorksContent() {
  const works = await getTrendingWorks();
  
  if (works.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <TrendingUp className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          急上昇中の作品がありません
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {works.map((work, index) => (
        <div key={work.id} className="relative">
          {/* ランクバッジ - 作品カードの外側左上に配置 */}
          <div className="absolute -top-4 -left-4 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 transform -rotate-12 hover:rotate-0 transition-transform">
            <TrendingUp className="w-4 h-4" />
            <span>#{index + 1}</span>
          </div>
          
          {/* WorkCardコンポーネントを使用 */}
          <WorkCard 
            work={{
              work_id: work.id,
              title: work.title,
              description: work.description,
              image_url: work.thumbnail_url,
              category: work.category,
              tags: work.tags,
              views: work.view_count,
              likes: work.like_count,
              comments: 0, // コメント数は取得していないので0
              author: work.author.name,
              author_id: work.author.id,
              series_title: undefined,
              episode_number: undefined,
              use_series_image: false,
              series_cover_image_url: undefined
            }}
          />
        </div>
      ))}
    </div>
  );
}

function TrendingWorksLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse">
          <div className="aspect-video bg-gray-300 dark:bg-gray-600 rounded-t-lg" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendingWorksSection({ className = '' }: TrendingWorksSectionProps) {
  return (
    <section className={`trending-works-section ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          本日の急上昇注目作品
        </h2>
      </div>
      
      <Suspense fallback={<TrendingWorksLoading />}>
        <TrendingWorksContent />
      </Suspense>
    </section>
  );
}