import { Metadata } from 'next'
import { getPostUserProfile } from '@/lib/auth'
import { getPostCreationData } from '@/features/post/server/loader'
import { WorkCreateBasicSection } from '@/features/post/sections/WorkCreateBasicSection'
import { WorkCreateContentSection } from '@/features/post/sections/WorkCreateContentSection'
import { WorkCreateMediaSection } from '@/features/post/sections/WorkCreateMediaSection'
import { WorkCreateSettingsSection } from '@/features/post/sections/WorkCreateSettingsSection'
import { WorkCreatePreviewSection } from '@/features/post/sections/WorkCreatePreviewSection'
import { WorkCreateDraftSection } from '@/features/post/sections/WorkCreateDraftSection'

export const metadata: Metadata = {
  title: '作品を投稿 - Bunshare',
  description: 'あなたの創造性を世界とシェアしましょう',
}

export default async function WorkCreatePage() {
  const pageStartTime = Date.now()
  
  // 認証チェックはmiddleware.tsで実行済み
  // プロフィール情報のみ取得
  const authStartTime = Date.now()
  const user = await getPostUserProfile()
  const authEndTime = Date.now()
  console.log(`[POST PAGE] プロフィール取得: ${authEndTime - authStartTime}ms`)
  
  // middleware.tsで認証済みのため、userは必ず存在するはず
  if (!user) {
    console.error('[POST PAGE] middleware認証後にuser=nullエラー')
    // フォールバック：念のためログインページへ
    return <div>認証エラーが発生しました。ページを再読み込みしてください。</div>
  }

  // シリーズと下書きを一括取得（usernameを渡してユーザー再取得をスキップ）
  const dataStartTime = Date.now()
  console.log(`[POST PAGE] usernameをloaderに渡す: ${user.username}`)
  const { series, drafts } = await getPostCreationData(user.id, user.username)
  const dataEndTime = Date.now()
  console.log(`[POST PAGE] データ取得 (series: ${series.length}, drafts: ${drafts.length}): ${dataEndTime - dataStartTime}ms`)
  
  const totalTime = Date.now() - pageStartTime
  console.log(`[POST PAGE] ページ全体の処理時間: ${totalTime}ms`)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ページヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          作品を投稿
        </h1>
        <p className="text-gray-600">
          あなたの創造性を世界とシェアしましょう
        </p>
      </div>

      {/* 下書き選択セクション */}
      {drafts.length > 0 && (
        <WorkCreateDraftSection drafts={drafts} />
      )}

      {/* 投稿フォーム */}
      <form className="space-y-8">
        {/* 基本情報セクション */}
        <WorkCreateBasicSection userSeries={series} />

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