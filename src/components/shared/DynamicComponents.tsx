'use client'

import dynamic from 'next/dynamic'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// 重いコンポーネントを遅延ロード
export const DynamicRecommendationsSection = dynamic(
  () => import('@/features/home/sections/RecommendationsSection').then(mod => ({ default: mod.RecommendationsSection })),
  {
    loading: () => <LoadingSpinner text="おすすめを読み込み中..." />,
    ssr: false // クライアント側のみでレンダリング
  }
)

export const DynamicUserTagsSection = dynamic(
  () => import('@/features/home/sections/UserTagsSection').then(mod => ({ default: mod.UserTagsSection })),
  {
    loading: () => <LoadingSpinner text="タグを読み込み中..." />,
    ssr: false
  }
)

export const DynamicWorkCard = dynamic(
  () => import('@/components/domain/WorkCard').then(mod => ({ default: mod.WorkCard })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />,
    ssr: true // SEO重要なので初期ロードは必要
  }
)

// モーダル系は完全に遅延ロード
export const DynamicLoginModal = dynamic(
  () => import('@/features/auth/components/LoginModal').then(mod => ({ default: mod.LoginModal })),
  {
    ssr: false
  }
)

// 設定系も遅延ロード
export const DynamicSettingsModal = dynamic(
  () => import('@/features/users/components/SettingsModal').then(mod => ({ default: mod.SettingsModal })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)