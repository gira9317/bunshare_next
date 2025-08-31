import { Sidebar } from '@/components/shared/Sidebar'
import { TopBar } from '@/components/shared/TopBar'
import { BottomNav } from '@/components/shared/BottomNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* デスクトップサイドバー */}
      <Sidebar />
      
      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col lg:ml-[280px]">
        {/* トップバー */}
        <TopBar />
        
        {/* ページコンテンツ */}
        <main className="flex-1 px-4 py-6 mt-16 mb-16 lg:mb-0 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      
      {/* モバイルボトムナビ */}
      <BottomNav />
    </div>
  )
}