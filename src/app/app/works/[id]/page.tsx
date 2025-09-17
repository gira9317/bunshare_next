import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkById } from '@/features/works/server/loader'
import { WorkDetailHeaderSection } from '@/features/works/sections/WorkDetailHeaderSection'
import { WorkDetailContentSection } from '@/features/works/sections/WorkDetailContentSection'
import { WorkDetailActionsSection } from '@/features/works/sections/WorkDetailActionsSection'
import { WorkDetailCommentsSection } from '@/features/works/sections/WorkDetailCommentsSection'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// 動的レンダリングを強制（Supabaseクライアントでクッキーを使用するため）
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params
    const work = await getWorkById(id)
    
    if (!work) {
      return {
        title: '作品が見つかりません - Bunshare',
      }
    }

    const author = work.users?.username || work.author || ''
    return {
      title: `${work.title} - ${author} | Bunshare`,
      description: work.description || `${author}による「${work.title}」を読む`,
      openGraph: {
        title: work.title,
        description: work.description || `${author}による作品`,
        images: work.image_url ? [work.image_url] : [],
      },
    }
  } catch (error) {
    return {
      title: '作品が見つかりません - Bunshare',
    }
  }
}

export default async function WorkDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id } = await params
  
  // 作品データとユーザー情報を並列取得
  const [work, { data: { user } }] = await Promise.all([
    getWorkById(id),
    supabase.auth.getUser()
  ])
  
  if (!work) {
    notFound()
  }

  // ユーザー関連データとシリーズ情報を並列取得
  const [userInteractions, seriesData] = await Promise.all([
    // ユーザーがいる場合のみ実行
    user ? Promise.all([
      // いいね状態をチェック
      supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('work_id', id)
        .single()
        .then(({ data }) => !!data),
      
      // ブックマーク状態をチェック
      supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('work_id', id)
        .single()
        .then(({ data }) => !!data),
      
      // 読書進捗を取得
      supabase
        .from('reading_progress')
        .select('progress')
        .eq('user_id', user.id)
        .eq('work_id', id)
        .single()
        .then(({ data }) => data?.progress || 0)
    ]) : Promise.resolve([false, false, 0]),
    
    // シリーズ情報を取得（もしシリーズの一部なら）
    work.series_id ? supabase
      .from('works')
      .select('work_id, title, episode_number')
      .eq('series_id', work.series_id)
      .order('episode_number', { ascending: true })
      .then(({ data }) => data || [])
    : Promise.resolve([])
  ])

  const [isLiked, isBookmarked, readingProgress] = userInteractions
  const seriesWorks = seriesData

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

      {/* コメントセクション - 段階的読み込み */}
      <Suspense fallback={<LoadingSpinner text="コメントを読み込み中..." />}>
        <WorkDetailCommentsSection
          workId={work.work_id}
          userId={user?.id}
        />
      </Suspense>
    </div>
  )
}