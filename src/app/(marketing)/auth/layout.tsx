import { SiteFooter } from '@/components/shared/SiteFooter'

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      {/* 背景アニメーション */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* メインコンテンツ - 認証フォーム用の狭いレイアウト */}
      <main className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
      
      {/* フッター */}
      <div className="relative">
        <SiteFooter />
      </div>
    </div>
  );
}