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
        "bg-purple-100 text-purple-700",
        "border border-purple-200",
        className
      )}
      aria-label={`タグ: ${tag}`}
    >
      #{tag}
    </span>
  )
}