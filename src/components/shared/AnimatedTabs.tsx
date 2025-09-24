'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTapFeedback } from '@/hooks/useTapFeedback';

export interface TabItem<T = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface AnimatedTabsProps<T = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
  variant?: 'underline' | 'pill' | 'card';
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  scrollable?: boolean;
}

export function AnimatedTabs<T = string>({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'underline',
  size = 'md',
  showCounts = true,
  scrollable = true
}: AnimatedTabsProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // activeTabが変更されたときにインデックスを更新
  useEffect(() => {
    const index = tabs.findIndex(tab => tab.id === activeTab);
    if (index !== -1) {
      setActiveIndex(index);
    }
  }, [activeTab, tabs]);

  // インジケーターの位置を更新
  useEffect(() => {
    const updateIndicator = () => {
      if (tabRefs.current[activeIndex] && variant === 'underline') {
        const activeTabElement = tabRefs.current[activeIndex];
        const containerElement = containerRef.current;
        
        if (activeTabElement && containerElement) {
          const containerRect = containerElement.getBoundingClientRect();
          const tabRect = activeTabElement.getBoundingClientRect();
          
          setIndicatorStyle({
            width: tabRect.width,
            left: tabRect.left - containerRect.left
          });
        }
      }
    };

    // 少し遅延させて正確な位置を取得
    const timeoutId = setTimeout(updateIndicator, 10);
    return () => clearTimeout(timeoutId);
  }, [activeIndex, variant, tabs]);

  // リサイズ時にインジケーターを再計算
  useEffect(() => {
    const handleResize = () => {
      if (variant === 'underline') {
        const timeoutId = setTimeout(() => {
          const activeTabElement = tabRefs.current[activeIndex];
          const containerElement = containerRef.current;
          
          if (activeTabElement && containerElement) {
            const containerRect = containerElement.getBoundingClientRect();
            const tabRect = activeTabElement.getBoundingClientRect();
            
            setIndicatorStyle({
              width: tabRect.width,
              left: tabRect.left - containerRect.left
            });
          }
        }, 10);
        return () => clearTimeout(timeoutId);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex, variant]);

  const sizeClasses = {
    sm: 'text-xs sm:text-sm py-2 px-2 sm:px-3',
    md: 'text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4',
    lg: 'text-sm sm:text-base py-3 px-3 sm:px-6'
  };

  const containerClasses = cn(
    'relative',
    variant === 'underline' && 'border-b border-gray-200',
    variant === 'pill' && 'p-1 bg-gray-100 rounded-xl',
    variant === 'card' && 'border-b border-gray-200',
    className
  );

  const tabClasses = (isActive: boolean) => cn(
    'relative z-10 font-medium transition-all duration-300 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
    'flex items-center gap-2 whitespace-nowrap',
    sizeClasses[size],
    
    // Variant specific styles
    variant === 'underline' && cn(
      'border-b-2 transition-colors',
      isActive
        ? 'text-blue-600 border-transparent'
        : 'text-gray-600 border-transparent hovertext-gray-100'
    ),
    
    variant === 'pill' && cn(
      'rounded-lg transition-all duration-300',
      isActive
        ? 'text-white bg-blue-600 shadow-md transform scale-105'
        : 'text-gray-600 hovertext-gray-100 hover:bg-gray-50'
    ),
    
    variant === 'card' && cn(
      'border-b-2 transition-all duration-300',
      isActive
        ? 'text-blue-600 border-blue-600 bg-blue-50'
        : 'text-gray-600 border-transparent hovertext-gray-100 hover:bg-gray-800/50'
    ),
    
    // Scrollable styles
    scrollable && 'flex-shrink-0'
  );

  const handleTabClick = (tab: TabItem<T>, index: number) => {
    setActiveIndex(index);
    onTabChange(tab.id);
  };

  return (
    <div className={cn(containerClasses, scrollable && 'max-w-full overflow-hidden')}>
      <div
        ref={containerRef}
        className={cn(
          'flex',
          scrollable && 'overflow-x-auto scrollbar-hide max-w-full',
          variant === 'underline' && 'space-x-0',
          variant === 'pill' && 'space-x-1',
          variant === 'card' && 'space-x-0'
        )}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const tapFeedback = useTapFeedback({ 
            scaleAmount: 0.96,
            duration: 100
          })
          
          return (
            <button
              key={String(tab.id)}
              ref={el => {
                tabRefs.current[index] = el
                // タップフィードバックのrefとtabRefsを両方設定
                if (tapFeedback.tapProps.ref && typeof tapFeedback.tapProps.ref === 'function') {
                  tapFeedback.tapProps.ref(el)
                } else if (tapFeedback.tapProps.ref && 'current' in tapFeedback.tapProps.ref) {
                  tapFeedback.tapProps.ref.current = el
                }
              }}
              {...(({ ref, ...rest }) => rest)(tapFeedback.tapProps)}
              onClick={() => handleTabClick(tab, index)}
              className={tabClasses(isActive)}
            >
              {tab.icon && (
                <span className={cn(
                  'transition-transform duration-300 flex-shrink-0',
                  isActive && variant === 'pill' && 'scale-110'
                )}>
                  {tab.icon}
                </span>
              )}
              <span className="truncate sm:truncate-none">{tab.label}</span>
              {showCounts && tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'px-1.5 sm:px-2 py-0.5 rounded-full text-xs transition-all duration-300 flex-shrink-0',
                  isActive
                    ? variant === 'pill'
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-600'
                    : 'bg-gray-200 text-gray-600'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Animated underline indicator */}
      {variant === 'underline' && (
        <div
          className="absolute bottom-0 h-0.5 transition-all duration-300 ease-out"
          style={{
            width: indicatorStyle.width,
            transform: `translateX(${indicatorStyle.left}px)`,
            background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)'
          }}
        />
      )}
    </div>
  );
}

// 使いやすさのためのプリセット
export function UnderlineTabs<T = string>(props: Omit<AnimatedTabsProps<T>, 'variant'>) {
  return <AnimatedTabs {...props} variant="underline" />;
}

export function PillTabs<T = string>(props: Omit<AnimatedTabsProps<T>, 'variant'>) {
  return <AnimatedTabs {...props} variant="pill" />;
}

export function CardTabs<T = string>(props: Omit<AnimatedTabsProps<T>, 'variant'>) {
  return <AnimatedTabs {...props} variant="card" />;
}