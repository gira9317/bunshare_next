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
    ? 'text-green-600 dark:text-green-400'
    : 'text-gray-500 dark:text-gray-400';

  return (
    <Link
      href={`/search?q=${encodeURIComponent(tag.tag)}&type=works`}
      className={cn(
        "trend-tag-chip group inline-flex items-center justify-between gap-3",
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "rounded-lg hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
        "transition-all duration-200",
        sizeClasses[size],
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
          #{tag.tag}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
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