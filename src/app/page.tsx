import Link from 'next/link'
import { ArrowRight, BookOpen, Users, TrendingUp, Sparkles, Heart, MessageCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      {/* 背景アニメーション */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative">
        {/* ヒーローセクション */}
        <section className="px-4 py-20 md:py-32">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              あなたの物語を
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                世界へ
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Bunshareは、創作活動を愛するすべての人のための
              プラットフォームです。小説やエッセイを共有し、
              新しい読者と出会いましょう。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                無料で始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                ログイン
              </Link>
            </div>
          </div>
        </section>

        {/* 特徴セクション */}
        <section className="px-4 py-20 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Bunshareの特徴
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<BookOpen className="h-8 w-8" />}
                title="簡単な投稿"
                description="直感的なエディタで、あなたの作品を簡単に投稿・編集できます。"
              />
              <FeatureCard
                icon={<Users className="h-8 w-8" />}
                title="コミュニティ"
                description="同じ趣味を持つ仲間と繋がり、作品への感想を交換しましょう。"
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8" />}
                title="成長の記録"
                description="読者からのフィードバックを受けて、創作スキルを向上させましょう。"
              />
            </div>
          </div>
        </section>

        {/* 機能詳細セクション */}
        <section className="px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
              創作活動をサポートする機能
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <FeatureDetail
                  icon={<Sparkles className="h-6 w-6 text-yellow-500" />}
                  title="タグとカテゴリー"
                  description="作品にタグを付けて、読者が見つけやすくしましょう。"
                />
                <FeatureDetail
                  icon={<Heart className="h-6 w-6 text-red-500" />}
                  title="いいねとブックマーク"
                  description="読者からの反応をリアルタイムで確認できます。"
                />
                <FeatureDetail
                  icon={<MessageCircle className="h-6 w-6 text-blue-500" />}
                  title="コメント機能"
                  description="読者と直接コミュニケーションを取ることができます。"
                />
              </div>
              <div className="relative h-96 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <BookOpen className="h-24 w-24 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                  <p className="text-gray-700 dark:text-gray-300">
                    あなたの創作活動を
                    <br />
                    全力でサポートします
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTAセクション */}
        <section className="px-4 py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              今すぐ始めよう
            </h2>
            <p className="text-xl mb-8 opacity-90">
              無料でアカウントを作成して、あなたの物語を共有しましょう
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-blue-600 bg-white rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
            >
              無料アカウント作成
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* フッター */}
        <footer className="px-4 py-8 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                利用規約
              </Link>
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                プライバシーポリシー
              </Link>
              <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                お問い合わせ
              </Link>
            </div>
            <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-500">
              © 2024 Bunshare. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="text-center p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-600 dark:text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  )
}

function FeatureDetail({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
    </div>
  )
}