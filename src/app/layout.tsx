import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from '@/components/shared/Sidebar'
import { TopBar } from '@/components/shared/TopBar'
import { BottomNav } from '@/components/shared/BottomNav'
import { cn } from '@/lib/utils'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bunshare - 物語投稿サイト",
  description: "創作物語を共有するプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* デスクトップサイドバー */}
          <Sidebar />
          
          {/* メインレイアウト */}
          <div className="md:ml-56 lg:ml-64 xl:ml-72">
            {/* トップバー */}
            <TopBar />
            
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
      </body>
    </html>
  );
}