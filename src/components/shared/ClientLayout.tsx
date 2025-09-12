'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { TopBarWrapper } from '@/components/shared/TopBarWrapper'
import { BottomNav } from '@/components/shared/BottomNav'
import { MobileSearchModal } from './MobileSearchModal'
import { SiteFooter } from './SiteFooter'
import { cn } from '@/lib/utils'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* デスクトップサイドバー */}
      <Sidebar />
      
      {/* メインレイアウト */}
      <div className="md:ml-56 lg:ml-64 xl:ml-72">
        {/* トップバー */}
        <TopBarWrapper onMobileSearchOpen={() => setShowMobileSearch(true)} />
        
        {/* ページコンテンツ */}
        <main className={cn(
          'px-3 sm:px-4 lg:px-6 xl:px-8',
          'py-4 sm:py-6',
          'pb-6',
          'max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto',
          'min-h-[calc(100vh-theme(spacing.16))]'
        )}>
          {children}
        </main>
        
        {/* フッター */}
        <SiteFooter />
        
        {/* スマホ専用フッタースペーサー */}
        <div className="h-20 md:hidden" />
      </div>
      
      {/* モバイルボトムナビ */}
      <BottomNav />
      
      {/* モバイル検索モーダル - 最上位レベル */}
      <MobileSearchModal
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
      />
    </div>
  )
}