import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeScript } from '@/components/shared/ThemeScript'
import { ClientProviders } from '@/components/shared/ClientProviders'
import { NavigationProgress } from '@/components/shared/NavigationProgress'
import { getAuthenticatedUser } from '@/lib/auth'
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser()

  return (
    <html lang="ja" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="theme-color" content="#ffffff" />
        <ThemeScript />
        {/* 重要データの先行取得（プリロード） */}
        <link rel="preload" href="/api/recommendations" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/api/novels" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/api/essays" as="fetch" crossOrigin="anonymous" />
        {user && (
          <link rel="preload" href="/api/user-tags" as="fetch" crossOrigin="anonymous" />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <NavigationProgress />
        <ClientProviders user={user}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}