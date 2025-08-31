import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from '@/components/shared/Sidebar'
import { TopBar } from '@/components/shared/TopBar'
import { BottomNav } from '@/components/shared/BottomNav'
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
          <div className="md:ml-64">
            {/* トップバー */}
            <TopBar />
            
            {/* ページコンテンツ */}
            <main className="px-4 py-6 pb-20 md:pb-6 max-w-6xl mx-auto">
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