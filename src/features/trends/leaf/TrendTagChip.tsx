import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrendTag } from '../types';

interface TrendTagChipProps {
  tag: TrendTag;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TrendTagChip({ tag, size = 'md', className = '' }: TrendTagChipProps) {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  };

  const growthColor = tag.growth_rate > 0 
    ? 'text-green-600'
    : 'text-gray-500';

  return (
    <Link
      href={`/app/search?q=${encodeURIComponent(tag.tag)}&type=works`}
      className={cn(
        "trend-tag-chip group inline-flex items-center justify-between gap-3",
        "bg-white border border-gray-200",
        "rounded-lg hover:shadow-md hover:border-blue-600",
        "transition-all duration-200",
        sizeClasses[size],
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          #{tag.tag}
        </div>
        <div className="text-sm text-gray-500">
          {tag.count.toLocaleString()} 投稿
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {tag.growth_rate > 0 && (
          <>
            <TrendingUp className={cn("w-4 h-4", growthColor)} />
            <span className={cn("text-sm font-medium", growthColor)}>
              +{Math.round(tag.growth_rate)}%
            </span>
          </>
        )}
      </div>
    </Link>
  );
}