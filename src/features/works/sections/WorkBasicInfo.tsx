import { Work } from '../types'
import { WorkDetailHeaderSection } from './WorkDetailHeaderSection'

interface WorkBasicInfoProps {
  work: Work
}

/**
 * 基本情報コンポーネント - 最優先で表示
 * ユーザー依存データなし、即座にレンダリング可能
 */
export async function WorkBasicInfo({ work }: WorkBasicInfoProps) {
  return (
    <div>
      <WorkDetailHeaderSection
        work={work}
        isLiked={false} // 初期状態、後から更新
        isBookmarked={false} // 初期状態、後から更新
      />
    </div>
  )
}