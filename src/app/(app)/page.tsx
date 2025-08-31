import { getWorks, getContinueReadingWorks, getUserLikesAndBookmarks } from '@/features/works/server/loader'
import { WorksFeedSection } from '@/features/works/sections/WorksFeedSection'
import { ContinueReadingSection } from '@/features/works/sections/ContinueReadingSection'
import { createClient } from '@/lib/supabase/server'
import CategoryChipsClient from './CategoryChipsClient'

async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // 作品データ取得
  const works = await getWorks(10, 0)
  
  // ユーザーがログインしている場合の追加データ取得
  let continueReadingWorks: any[] = []
  let userLikes: string[] = []
  let userBookmarks: string[] = []
  
  if (user) {
    // 続きを読む作品を取得
    continueReadingWorks = await getContinueReadingWorks(user.id)
    
    // いいね・ブックマーク状態を取得
    const workIds = works.map(w => w.id)
    const { likedWorkIds, bookmarkedWorkIds } = await getUserLikesAndBookmarks(user.id, workIds)
    userLikes = likedWorkIds
    userBookmarks = bookmarkedWorkIds
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
}

export default HomePage