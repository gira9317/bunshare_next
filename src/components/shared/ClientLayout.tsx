'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { TopBarWrapper } from '@/components/shared/TopBarWrapper'
import { BottomNav } from '@/components/shared/BottomNav'
import { MobileSearchModal } from './MobileSearchModal'
import { UserSearchModal } from '@/features/search/leaf/UserSearchModal'
import { SiteFooter } from './SiteFooter'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/shared/AuthProvider'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { user } = useAuth()
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showUserSearchModal, setShowUserSearchModal] = useState(false)
  const [userSearchData, setUserSearchData] = useState<{
    users: Array<any>;
    query: string;
  }>({ users: [], query: '' })

  // Force light mode for unauthenticated users
  useEffect(() => {
    if (!user) {
      document.documentElement.classList.remove('dark')
    }
  }, [user])

  // Global function to open user search modal
  if (typeof window !== 'undefined') {
    (window as any).openUserSearchModal = (users: Array<any>, query: string) => {
      setUserSearchData({ users, query })
      setShowUserSearchModal(true)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 transition-colors duration-200">
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
      
      {/* ユーザー検索モーダル - 最上位レベル */}
      <UserSearchModal
        isOpen={showUserSearchModal}
        onClose={() => setShowUserSearchModal(false)}
        initialUsers={userSearchData.users}
        searchQuery={userSearchData.query}
      />
    </div>
  )
}