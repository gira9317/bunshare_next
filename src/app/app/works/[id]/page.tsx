import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkById, getUserWorkInteractions } from '@/features/works/server/loader'
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

  // ユーザー相互作用状態を取得（シリーズ情報は作品データに含まれている）
  const userInteractions = await getUserWorkInteractions(user?.id || '', id)
  
  // PostgreSQL関数から取得したシリーズ情報を使用
  // フォールバックの場合は別途取得
  const seriesWorks = work.series_works || (
    work.series_id ? await supabase
      .from('works')
      .select('work_id, title, episode_number')
      .eq('series_id', work.series_id)
      .order('episode_number', { ascending: true })
      .then(({ data }) => data || [])
    : []
  )

  const { isLiked, isBookmarked, readingProgress } = userInteractions

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ヘッダーセクション - 基本情報を即座表示 */}
      <WorkDetailHeaderSection
        work={work}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
      />

      {/* コンテンツセクション - メインコンテンツ */}
      <WorkDetailContentSection
        work={work}
        readingProgress={readingProgress}
        seriesWorks={seriesWorks}
        userId={user?.id}
      />

      {/* アクションセクション - ユーザー操作系は段階的読み込み */}
      <Suspense fallback={<div className="h-16 bg-gray-100 rounded animate-pulse" />}>
        <WorkDetailActionsSection
          work={work}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
        />
      </Suspense>

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