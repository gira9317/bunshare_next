interface RecommendationSourceBadgeProps {
  source: string
  strategy: 'personalized' | 'adaptive' | 'popular'
}

export function RecommendationSourceBadge({ source, strategy }: RecommendationSourceBadgeProps) {
  const getBadgeColor = (strategy: string) => {
    switch (strategy) {
      case 'personalized':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      case 'adaptive':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'popular':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(strategy)}`}
    >
      {source}
    </span>
  )
}