import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: string
  className?: string
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
        "border border-purple-200 dark:border-purple-700",
        className
      )}
      aria-label={`タグ: ${tag}`}
    >
      #{tag}
    </span>
  )
}