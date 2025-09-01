import { cn } from '@/lib/utils'

interface NotificationEmptyProps {
  className?: string
}

export function NotificationEmpty({ className }: NotificationEmptyProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12',
      'text-gray-500 dark:text-gray-400',
      className
    )}>
      <div className="text-4xl mb-3">🔔</div>
      <p className="text-sm font-medium">新しい通知はありません</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        通知があるとここに表示されます
      </p>
    </div>
  )
}