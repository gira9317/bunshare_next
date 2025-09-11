import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkById } from '@/features/works/server/loader'
import { WorkDetailHeaderSection } from '@/features/works/sections/WorkDetailHeaderSection'
import { WorkDetailContentSection } from '@/features/works/sections/WorkDetailContentSection'
import { WorkDetailActionsSection } from '@/features/works/sections/WorkDetailActionsSection'
import { WorkDetailCommentsSection } from '@/features/works/sections/WorkDetailCommentsSection'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const work = await getWorkById(id)
  
  if (!work) {
    return {
      title: '作品が見つかりません',
    }
  }

  return {
    title: `${work.title} - ${work.author || ''}`,
    description: work.description || `${work.author}による「${work.title}」を読む`,
  }
}

export default async function WorkDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params
  
  // 作品データを取得
  const work = await getWorkById(id)
  
  if (!work) {
    notFound()
  }

  // 現在のユーザー情報を取得
  const { data: { user } } = await supabase.auth.getUser()
  
  // いいね・ブックマーク状態を取得
  let isLiked = false
  let isBookmarked = false
  let readingProgress = 0
  
  if (user) {
    // いいね状態をチェック
    const { data: likeData } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('work_id', id)
      .single()
    
    isLiked = !!likeData
    
    // ブックマーク状態をチェック
    const { data: bookmarkData } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('work_id', id)
      .single()
    
    isBookmarked = !!bookmarkData
    
    // 読書進捗を取得
    const { data: progressData } = await supabase
      .from('reading_progress')
      .select('progress')
      .eq('user_id', user.id)
      .eq('work_id', id)
      .single()
    
    readingProgress = progressData?.progress || 0
  }
  
  // シリーズ情報を取得（もしシリーズの一部なら）
  let seriesWorks = []
  if (work.series_id) {
    const { data: series } = await supabase
      .from('works')
      .select('work_id, title, episode_number')
      .eq('series_id', work.series_id)
      .order('episode_number', { ascending: true })
    
    seriesWorks = series || []
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ヘッダーセクション */}
      <WorkDetailHeaderSection
        work={work}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
      />

      {/* コンテンツセクション */}
      <WorkDetailContentSection
        work={work}
        readingProgress={readingProgress}
        seriesWorks={seriesWorks}
        userId={user?.id}
      />

      {/* アクションセクション */}
      <WorkDetailActionsSection
        work={work}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
      />

      {/* コメントセクション */}
      <WorkDetailCommentsSection
        workId={work.work_id}
        userId={user?.id}
      />
    </div>
  )
}