import Link from 'next/link'
import { ArrowRight, BookOpen, Users, TrendingUp, Sparkles, Heart, MessageCircle, Eye, CheckCircle, Star, BarChart } from 'lucide-react'
import { getLandingWorks } from '@/lib/landing-works'
import { FloatingWorkCards } from '@/components/landing/FloatingWorkCards'

// 動的レンダリングを強制（クッキーを使用するため）
export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const landingWorks = await getLandingWorks()
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ナビゲーションヘッダー */}
      <header className="fixed w-full top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <img 
                  src="/images/logo/Bunshare_logo.png" 
                  alt="Bunshare" 
                  className="h-8 w-auto dark:hidden"
                />
                <img 
                  src="/images/logo/Bunshare_logo_dark_mode.png" 
                  alt="Bunshare" 
                  className="h-8 w-auto hidden dark:block"
                />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Bunshare</span>
              </Link>
            </div>
            
            <nav className="md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                機能
              </Link>
              <Link href="#gallery" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                作品
              </Link>
              <Link href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                料金
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ログイン
              </Link>
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                無料で始める
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="pt-20 md:pt-32 lg:pt-40 pb-16 md:pb-24 lg:pb-32 px-4 relative overflow-hidden flex items-center h-screen md:h-[900px] lg:h-[1040px]">
        {/* 背景の流れる作品カード */}
        <FloatingWorkCards works={landingWorks} />
        
        {/* 背景アニメーション */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative">
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8">
            <span className="block">もっと多くの人に。</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              あなたの物語。
            </span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-4xl mx-auto">
            Bunshareは、創作者と読者をつなぐ新しいプラットフォーム。<br />
            あなたの想像力を、世界中の読者と共有しましょう。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl"
            >
              無料で始める
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button className="inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              <div className="w-5 h-5 mr-2 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-2 border-l-white border-t-transparent border-b-transparent border-t border-b ml-0.5"></div>
              </div>
              デモを見る
            </button>
          </div>
        </div>
      </section>

      {/* 統計セクション */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 text-lg">
            多くの創作者に選ばれています
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">10,000+</div>
              <div className="text-gray-600 dark:text-gray-400">アクティブな創作者</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">50,000+</div>
              <div className="text-gray-600 dark:text-gray-400">公開作品数</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">1M+</div>
              <div className="text-gray-600 dark:text-gray-400">月間読者数</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">98%</div>
              <div className="text-gray-600 dark:text-gray-400">満足度</div>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
              機能
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              創作活動を支える充実の機能
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Bunshareは、物語を書く人と読む人、すべての人のために設計されています。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8" />}
              title="シンプルな投稿フロー"
              description="直感的なエディターで、執筆から公開までスムーズに。下書き保存や予約投稿も可能。"
            />
            <FeatureCard
              icon={<BarChart className="h-8 w-8" />}
              title="リアルタイム分析"
              description="読者の反応や閲覧数をリアルタイムで確認できます。"
            />
            <FeatureCard
              icon={<Star className="h-8 w-8" />}
              title="評価システム"
              description="読者からの評価やレビューで成長を実感できます。"
            />
            <FeatureCard
              icon={<MessageCircle className="h-8 w-8" />}
              title="コミュニティ機能"
              description="読者や他の作家との交流で創作の輪を広げることができます。"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="タグとカテゴリー"
              description="作品にタグを付けて、読者が見つけやすくしましょう。"
            />
            <FeatureCard
              icon={<Heart className="h-8 w-8" />}
              title="いいねとブックマーク"
              description="読者からの反応をリアルタイムで確認できます。"
            />
          </div>
        </div>
      </section>

      {/* 作品ギャラリー */}
      <section id="gallery" className="py-20 bg-gray-50 dark:bg-gray-800 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium mb-4">
              ギャラリー
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              注目の作品
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300">
              今月最も読まれている作品をご紹介
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <WorkCard
              title="星の記憶"
              author="流星ライター"
              genre="ファンタジー"
              likes={2345}
              comments={156}
              icon="📖"
            />
            <WorkCard
              title="深夜の訪問者"
              author="月光探偵"
              genre="ミステリー"
              likes={1823}
              comments={234}
              icon="🔍"
            />
            <WorkCard
              title="桜の下で待つ君へ"
              author="春風詩人"
              genre="恋愛"
              likes={3102}
              comments={412}
              icon="💕"
            />
          </div>
          
          <div className="text-center mt-12">
            <Link
              href="/app/works"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
            >
              すべての作品を見る
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* テスティモニアル */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-sm font-medium mb-4">
              レビュー
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              創作者からの声
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300">
              Bunshareを利用している創作者の方々からのメッセージ
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <TestimonialCard
              rating={5}
              text="シンプルな操作で、自分の作品を世界中の読者に届けられる。読者からのフィードバックもリアルタイムで得られて、次の創作のモチベーションになっています。"
              author="田中太郎"
              title="小説家・300作品公開"
              avatar="👨‍💼"
            />
            <TestimonialCard
              rating={5}
              text="執筆から公開までのフローがとてもスムーズ。特にエディターの使いやすさは抜群で、書くことに集中できる環境が整っています。"
              author="佐藤花子"
              title="エッセイスト・150作品公開"
              avatar="👩‍🎨"
            />
            <TestimonialCard
              rating={5}
              text="読者との距離が近いのがBunshareの魅力。コメント機能を通じて直接交流でき、作品をより良くしていくヒントを得られます。"
              author="鈴木一郎"
              title="詩人・500作品公開"
              avatar="👨‍🎓"
            />
          </div>
        </div>
      </section>

      {/* 料金プラン */}
      <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-800 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium mb-4">
              料金
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              シンプルな料金プラン
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300">
              あなたの創作スタイルに合わせたプランを選べます
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <PricingCard
              name="フリー"
              price="0"
              period="月"
              description="趣味で創作を楽しむ方に"
              features={[
                "作品投稿数無制限",
                "基本的な分析機能",
                "コミュニティ参加"
              ]}
              buttonText="今すぐ始める"
              buttonLink="/auth/signup"
            />
            <PricingCard
              name="プロ"
              price="980"
              period="月"
              description="本格的に創作活動をしたい方に"
              features={[
                "フリープランの全機能",
                "高度な分析ダッシュボード",
                "優先サポート",
                "カスタムテーマ",
                "予約投稿機能"
              ]}
              buttonText="プロプランを始める"
              buttonLink="/auth/signup"
              featured
            />
            <PricingCard
              name="エンタープライズ"
              price="お問い合わせ"
              description="出版社・法人向け"
              features={[
                "プロプランの全機能",
                "専任担当者",
                "APIアクセス",
                "カスタマイズ対応"
              ]}
              buttonText="お問い合わせ"
              buttonLink="/contact"
            />
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-6">
            あなたの物語を、<br />
            世界中の読者に届けませんか？
          </h2>
          <p className="text-base md:text-lg lg:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Bunshareは、創作者のための最高のプラットフォームです。<br />
            今すぐ無料で始めて、あなたの作品を世界に発信しましょう。
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
            >
              無料で始める
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <div className="flex items-center text-sm opacity-80">
              <CheckCircle className="h-4 w-4 mr-2" />
              クレジットカード不要・いつでも解約可能
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <img 
                  src="/images/logo/Bunshare_logo.png" 
                  alt="Bunshare" 
                  className="h-8 w-auto dark:hidden"
                />
                <img 
                  src="/images/logo/Bunshare_logo_dark_mode.png" 
                  alt="Bunshare" 
                  className="h-8 w-auto hidden dark:block"
                />
              </Link>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                物語でつながる、あなたの世界
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">プロダクト</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link href="#features" className="hover:text-gray-900 dark:hover:text-white">機能</Link></li>
                <li><Link href="#pricing" className="hover:text-gray-900 dark:hover:text-white">料金</Link></li>
                <li><Link href="/app" className="hover:text-gray-900 dark:hover:text-white">アプリ</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">リソース</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white">ヘルプ</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white">コミュニティ</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white">ブログ</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">法務</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li><Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">利用規約</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white">プライバシーポリシー</Link></li>
                <li><Link href="/contact" className="hover:text-gray-900 dark:hover:text-white">お問い合わせ</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              © 2025 Bunshare. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-gray-500 dark:text-gray-400 text-sm">日本語</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">English</span>
            </div>
          </div>
        </div>
      </footer>
      
      {/* スマホ専用フッタースペーサー */}
      <div className="h-20 md:hidden" />
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-600 dark:text-blue-400 mb-4">
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

function WorkCard({ title, author, genre, likes, comments, icon }: {
  title: string
  author: string
  genre: string
  likes: number
  comments: number
  icon: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-2xl mb-4">
          {icon}
        </div>
        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-full mb-3">
          {genre}
        </span>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          by {author}
        </p>
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Heart className="h-4 w-4 mr-1" />
            {likes.toLocaleString()}
          </div>
          <div className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-1" />
            {comments}
          </div>
        </div>
      </div>
    </div>
  )
}

function TestimonialCard({ rating, text, author, title, avatar }: {
  rating: number
  text: string
  author: string
  title: string
  avatar: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="flex mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
        ))}
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
        "{text}"
      </p>
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl mr-4">
          {avatar}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {author}
          </h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {title}
          </p>
        </div>
      </div>
    </div>
  )
}

function PricingCard({ name, price, period, description, features, buttonText, buttonLink, featured }: {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  buttonText: string
  buttonLink: string
  featured?: boolean
}) {
  return (
    <div className={`rounded-2xl p-8 ${featured ? 'bg-gradient-to-b from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'} relative`}>
      {featured && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
            人気
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {name}
        </h3>
        <div className="mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">¥</span>
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{price}</span>
          {period && <span className="text-gray-500 dark:text-gray-400">/{period}</span>}
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
      
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Link
        href={buttonLink}
        className={`w-full inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all ${featured 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        {buttonText}
      </Link>
    </div>
  )
}