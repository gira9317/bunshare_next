import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkCreateBasicSection } from '@/features/works/sections/WorkCreateBasicSection'
import { WorkCreateContentSection } from '@/features/works/sections/WorkCreateContentSection'
import { WorkCreateMediaSection } from '@/features/works/sections/WorkCreateMediaSection'
import { WorkCreateSettingsSection } from '@/features/works/sections/WorkCreateSettingsSection'
import { WorkCreatePreviewSection } from '@/features/works/sections/WorkCreatePreviewSection'
import { WorkCreateDraftSection } from '@/features/works/sections/WorkCreateDraftSection'
import { getUserDraftWorks } from '@/features/users/server/loader'

export const metadata: Metadata = {
  title: '作品を投稿 - Bunshare',
  description: 'あなたの創造性を世界とシェアしましょう',
}

export default async function WorkCreatePage() {
  const supabase = await createClient()
  
  // ユーザー認証確認
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // ユーザーの既存シリーズを取得
  const { data: userSeries } = await supabase
    .from('series')
    .select('id, title, description, cover_image_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // ユーザーの下書き一覧を取得
  const userDrafts = await getUserDraftWorks(user.id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ページヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          作品を投稿
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          あなたの創造性を世界とシェアしましょう
        </p>
      </div>

      {/* 下書き選択セクション */}
      {userDrafts.length > 0 && (
        <WorkCreateDraftSection drafts={userDrafts} />
      )}

      {/* 投稿フォーム */}
      <form className="space-y-8">
        {/* 基本情報セクション */}
        <WorkCreateBasicSection userSeries={(userSeries || []).map(series => ({
          series_id: series.id,
          title: series.title,
          description: series.description,
          cover_image_url: series.cover_image_url
        }))} />

        {/* メディアセクション */}
        <WorkCreateMediaSection />

        {/* 本文セクション */}
        <WorkCreateContentSection />

        {/* 設定セクション */}
        <WorkCreateSettingsSection />

        {/* プレビューセクション */}
        <WorkCreatePreviewSection />
      </form>
    </div>
  )
}