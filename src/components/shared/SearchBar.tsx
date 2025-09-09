'use client';

import { SearchInput } from '@/features/search/leaf/SearchInput';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SearchBar({ 
  className, 
  placeholder = '作品や作者を検索...',
  size = 'md' 
}: SearchBarProps) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  return (
    <div className={`${sizeClasses[size]} w-full ${className || ''}`}>
      <SearchInput 
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}