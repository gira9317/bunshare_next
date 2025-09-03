import { getWorks, getContinueReadingWorks, getUserLikesAndBookmarks } from '@/features/works/server/loader'
import { WorksFeedSection } from '@/features/home/sections/WorksFeedSection'
import { ContinueReadingSection } from '@/features/home/sections/ContinueReadingSection'
import { getAuthenticatedUser } from '@/lib/auth'
import { CategoryChipsClient } from '@/features/home/leaf/CategoryChipsClient'

async function HomePage() {
  try {
    const user = await getAuthenticatedUser()
    
    // 作品データ取得
    const works = await getWorks(10, 0)
    
    // ユーザーがログインしている場合の追加データ取得
    let continueReadingWorks: any[] = []
    let userLikes: string[] = []
    let userBookmarks: string[] = []
    
    if (user) {
      try {
        // 続きを読む作品を取得
        continueReadingWorks = await getContinueReadingWorks(user.id)
        
        // いいね・ブックマーク状態を取得
        const workIds = works.map(w => w.work_id)
        const { likedWorkIds, bookmarkedWorkIds } = await getUserLikesAndBookmarks(user.id, workIds)
        userLikes = likedWorkIds
        userBookmarks = bookmarkedWorkIds
      } catch (error) {
        console.error('Error loading user-specific data:', error)
      }
    }

    return (
      <div className="space-y-8">
        {/* カテゴリチップス */}
        <CategoryChipsClient />
        
        {/* 続きを読むセクション */}
        {continueReadingWorks.length > 0 && (
          <ContinueReadingSection works={continueReadingWorks} />
        )}
        
        {/* 作品フィード */}
        <WorksFeedSection 
          works={works}
          userLikes={userLikes}
          userBookmarks={userBookmarks}
        />
      </div>
    )
  } catch (error) {
    console.error('HomePage error:', error)
    
    // エラー時はフォールバック表示
    const works = await getWorks(10, 0)
    
    return (
      <div className="space-y-8">
        <CategoryChipsClient />
        <WorksFeedSection 
          works={works}
          userLikes={[]}
          userBookmarks={[]}
        />
      </div>
    )
  }
}

export default HomePage