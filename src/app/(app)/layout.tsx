import { Sidebar } from '@/components/shared/Sidebar'
import { TopBarWrapper } from '@/components/shared/TopBarWrapper'
import { BottomNav } from '@/components/shared/BottomNav'
import { cn } from '@/lib/utils'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* デスクトップサイドバー */}
      <Sidebar />
      
      {/* メインレイアウト */}
      <div className="md:ml-56 lg:ml-64 xl:ml-72">
        {/* トップバー */}
        <TopBarWrapper />
        
        {/* ページコンテンツ */}
        <main className={cn(
          'px-3 sm:px-4 lg:px-6 xl:px-8',
          'py-4 sm:py-6',
          'pb-20 sm:pb-24 md:pb-6',
          'max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto',
          'min-h-[calc(100vh-theme(spacing.16))]'
        )}>
          {children}
        </main>
      </div>
      
      {/* モバイルボトムナビ */}
      <BottomNav />
    </div>
  );
}