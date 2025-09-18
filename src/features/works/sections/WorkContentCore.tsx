import { Work } from '../types'
import { cn } from '@/lib/utils'

interface WorkContentCoreProps {
  work: Work
  className?: string
}

/**
 * 軽量コンテンツコア - 本文のみを即座表示
 * 最小限のスタイルでコンテンツファーストレンダリング
 */
export function WorkContentCore({ work, className }: WorkContentCoreProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* 本文 - 最優先表示、装飾なし */}
      <div className="prose prose-gray max-w-none">
        <div 
          id="main-content-text"
          className="whitespace-pre-wrap leading-relaxed text-base text-gray-800"
          dangerouslySetInnerHTML={{ 
            __html: work.content?.replace(/\n/g, '<br />') || '' 
          }}
        />
      </div>
    </div>
  )
}