'use client';

import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function FilterChips({ 
  options, 
  value, 
  onChange, 
  disabled = false,
  size = 'md' 
}: FilterChipsProps) {
  return (
    <div className={cn(
      "flex flex-wrap gap-2",
      size === 'sm' ? 'gap-1' : 'gap-2'
    )}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={cn(
            "transition-all duration-200 border font-medium rounded-full",
            "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm',
            value === option.value
              ? "bg-blue-600 border-blue-600 shadow-md"
              : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-gray-50",
            disabled && "opacity-50 cursor-not-allowed hover:scale-100"
          )}
          style={value === option.value ? { color: 'white' } : {}}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}