import { Suspense } from 'react';
import { getTrendingWorks } from '../server/loader';
import { TrendTagChip } from '../leaf/TrendTagChip';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Hash } from 'lucide-react';

interface TrendTagsSectionProps {
  className?: string;
}

async function TrendTagsContent() {
  const works = await getTrendingWorks();
  
  // トレンド作品からタグを抽出してカウント
  const tagCounts = new Map<string, number>();
  works.forEach(work => {
    if (work.tags && Array.isArray(work.tags)) {
      work.tags.forEach((tag: string) => {
        if (typeof tag === 'string' && tag.trim()) {
          const normalizedTag = tag.trim().toLowerCase();
          tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
        }
      });
    }
  });
  
  // タグをカウント順にソートして変換
  const tags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({
      tag,
      count,
      trend_score: count * 10,
      growth_rate: 0
    }));
  
  if (tags.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <Hash className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600">
          注目作品にタグがありません
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tags.map((tag, index) => {
        // タグのトレンドスコアに基づいてサイズを調整
        const size = index < 3 ? 'lg' : index < 8 ? 'md' : 'sm';
        
        return (
          <TrendTagChip 
            key={tag.tag} 
            tag={tag} 
            size={size}
          />
        );
      })}
    </div>
  );
}

function TrendTagsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div 
          key={i} 
          className="bg-gray-200 rounded-lg animate-pulse p-4 h-20"
        />
      ))}
    </div>
  );
}

export function TrendTagsSection({ className = '' }: TrendTagsSectionProps) {
  return (
    <section className={`trend-tags-section ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Hash className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-900">
          注目作品のタグ
        </h2>
      </div>
      
      <Suspense fallback={<TrendTagsLoading />}>
        <TrendTagsContent />
      </Suspense>
    </section>
  );
}