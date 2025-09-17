import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWorkById, getWorkMetadata } from '@/features/works/server/loader'
import { WorkBasicInfo } from '@/features/works/sections/WorkBasicInfo'
import { WorkContentWithProgress } from '@/features/works/sections/WorkContentWithProgress'
import { WorkUserActions } from '@/features/works/sections/WorkUserActions'
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
    // 軽量なメタデータ専用クエリを使用
    const work = await getWorkMetadata(id)
    
    if (!work) {
      return {
        title: '作品が見つかりません - Bunshare',
      }
    }

    return {
      title: `${work.title} - ${work.author} | Bunshare`,
      description: work.description || `${work.author}による「${work.title}」を読む`,
      openGraph: {
        title: work.title,
        description: work.description || `${work.author}による作品`,
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
  const { id } = await params
  
  // 🚀 最重要データのみ並列取得（段階的レンダリングのため）
  const [work, userAuth] = await Promise.all([
    getWorkById(id),
    createClient().then(supabase => supabase.auth.getUser())
  ])
  
  if (!work) {
    notFound()
  }

  const user = userAuth.data?.user
  const seriesWorks = work.series_works || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* 🏃‍♂️ 最優先: 基本情報を即座表示（ユーザー依存なし） */}
      <WorkBasicInfo work={work} />

      {/* 🚀 高優先度: コンテンツ+進捗（ユーザー依存、Suspenseでラップ） */}
      <Suspense fallback={
        <div className="space-y-6">
          <div className="h-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      }>
        <WorkContentWithProgress
          work={work}
          seriesWorks={seriesWorks}
          userId={user?.id}
        />
      </Suspense>

      {/* ⚡ 中優先度: ユーザー操作系（段階的読み込み） */}
      <Suspense fallback={
        <div className="flex gap-4 p-4">
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      }>
        <WorkUserActions
          work={work}
          userId={user?.id}
        />
      </Suspense>

      {/* 💬 低優先度: コメントセクション（最後に読み込み） */}
      <Suspense fallback={
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      }>
        <WorkDetailCommentsSection
          workId={work.work_id}
          userId={user?.id}
        />
      </Suspense>
    </div>
  )
}