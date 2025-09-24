import { SiteFooter } from '@/components/shared/SiteFooter'

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                document.documentElement.classList.remove('dark')
              } catch (e) {}
            })()
          `
        }}
        suppressHydrationWarning
      />
      {/* auth-page クラスで特定の色スキームを強制 */}
      <div className="auth-page min-h-screen bg-white">
        
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
    </>
  );
}