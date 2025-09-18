interface RecommendationSourceBadgeProps {
  source: string
  strategy: 'personalized' | 'adaptive' | 'popular'
}

export function RecommendationSourceBadge({ source, strategy }: RecommendationSourceBadgeProps) {
  const getBadgeColor = (strategy: string) => {
    switch (strategy) {
      case 'personalized':
        return 'bg-purple-100 text-purple-700'
      case 'adaptive':
        return 'bg-blue-100 text-blue-700'
      case 'popular':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
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