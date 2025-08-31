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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
