import { Suspense } from 'react';
import { TrendPageClientSection } from './TrendPageClientSection';
import { TrendHeroSection } from './TrendHeroSection';
import { TrendingWorksSection } from './TrendingWorksSection';
import { TrendTagsSection } from './TrendTagsSection';
import { WorksRankingSection } from './WorksRankingSection';
import { UsersRankingSection } from './UsersRankingSection';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface TrendPageSectionProps {
  className?: string;
}

function RecommendedContent() {
  return (
    <div className="space-y-8">
      <TrendHeroSection />
      <TrendingWorksSection />
      <TrendTagsSection />
    </div>
  );
}

function WorksRankingContent() {
  return (
    <div className="space-y-8">
      <WorksRankingSection />
    </div>
  );
}

function UsersRankingContent() {
  return (
    <div className="space-y-8">
      <UsersRankingSection />
    </div>
  );
}

function AnnouncementsContent() {
  return (
    <div className="bg-white dark:bg-gray-900 py-8 md:py-16">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        {/* ヘッダー */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
            Development Roadmap
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            次世代創作プラットフォームへの進化
          </p>
        </div>

        {/* 路線図スタイル */}
        <div className="relative">
          {/* メイン路線 */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 md:w-1 bg-gray-300 dark:bg-gray-600"></div>
          
          {/* 電車アニメーション */}
          <div className="absolute left-4 md:left-6 top-0 w-4 h-6 md:w-5 md:h-8 bg-blue-500 rounded-md shadow-lg z-20 animate-bounce opacity-80">
            <div className="flex items-center justify-center h-full">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full"></div>
            </div>
          </div>
          
          <div className="space-y-12 md:space-y-16">
            {/* 現在地 */}
            <div className="relative flex items-start md:items-center">
              {/* 現在地マーク */}
              <div className="relative z-10 group flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-600 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl">
                  <span className="text-white font-bold text-xs md:text-sm">NOW</span>
                </div>
                {/* 現在稼働中の表示 */}
                <div className="absolute -top-2 -right-2">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                {/* 活動中の光 */}
                <div className="absolute inset-0 w-16 h-16 bg-green-400 rounded-full animate-ping opacity-30"></div>
                {/* 人気の証 */}
                <div className="absolute -top-1 -left-2 w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                <div className="absolute -bottom-2 -right-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.7s'}}></div>
              </div>

              {/* 現在地情報板 */}
              <div className="ml-4 md:ml-8 flex-1 min-w-0">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 rounded-lg p-4 md:p-6 shadow-md border-2 border-green-200 dark:border-green-700 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">
                      The Foundation Era
                    </h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">稼働中</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">2024</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">作品投稿・閲覧機能</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">ユーザーフォロー</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">いいね・コメント</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">検索・トレンド機能</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">ブックマーク</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">シリーズ管理</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Version 2.0 駅 */}
            <div className="relative flex items-start md:items-center">
              {/* 駅マーク */}
              <div className="relative z-10 group flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl animate-pulse">
                  <span className="text-white font-bold text-xs md:text-sm">2.0</span>
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-spin">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                {/* 光の輪 */}
                <div className="absolute inset-0 w-16 h-16 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                {/* パーティクル効果 */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
              </div>

              {/* 駅情報板 */}
              <div className="ml-4 md:ml-8 flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-md border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-600">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">
                      The Great Ascension
                    </h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">開発中</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">2025 Q1</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 transform transition-all duration-200 hover:scale-105 hover:text-blue-600 dark:hover:text-blue-400">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-700 dark:text-gray-300">AIライティングアシスタント</span>
                    </div>
                    <div className="flex items-center gap-2 transform transition-all duration-200 hover:scale-105 hover:text-blue-600 dark:hover:text-blue-400" style={{animationDelay: '0.1s'}}>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-700 dark:text-gray-300">文章先生機能</span>
                    </div>
                    <div className="flex items-center gap-2 transform transition-all duration-200 hover:scale-105 hover:text-blue-600 dark:hover:text-blue-400" style={{animationDelay: '0.2s'}}>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-700 dark:text-gray-300">クリエイターサブスク</span>
                    </div>
                    <div className="flex items-center gap-2 transform transition-all duration-200 hover:scale-105 hover:text-blue-600 dark:hover:text-blue-400" style={{animationDelay: '0.3s'}}>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-700 dark:text-gray-300">原稿用紙出力</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Version 2.5 駅 */}
            <div className="relative flex items-start md:items-center">
              {/* 駅マーク */}
              <div className="relative z-10 group flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl">
                  <span className="text-white font-bold text-xs md:text-sm">2.5</span>
                </div>
                {/* 準備中の光 */}
                <div className="absolute inset-0 w-16 h-16 bg-purple-400 rounded-full animate-pulse opacity-30"></div>
              </div>

              {/* 駅情報板 */}
              <div className="ml-4 md:ml-8 flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-md border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-600">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">
                      The Digital Renaissance
                    </h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">計画中</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">2025 Q2</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">AI動画共有機能</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">創作者ダッシュボード</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Version 3.0 駅 */}
            <div className="relative flex items-start md:items-center">
              {/* 駅マーク */}
              <div className="relative z-10 group flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-pink-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl opacity-70">
                  <span className="text-white font-bold text-xs md:text-sm">3.0</span>
                </div>
                {/* 未来への光 */}
                <div className="absolute inset-0 w-16 h-16 bg-pink-400 rounded-full animate-pulse opacity-20"></div>
                {/* 星の効果 */}
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-300 rounded-full animate-pulse opacity-60" style={{animationDelay: '2s'}}></div>
              </div>

              {/* 駅情報板 */}
              <div className="ml-4 md:ml-8 flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-md border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-600">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">
                      The Empire of Creation
                    </h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">構想中</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">2025後半</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">広告プラットフォーム</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">コラボレーション</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 終点マーク */}
            <div className="relative flex items-center">
              <div className="w-12 h-6 md:w-16 md:h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">続く...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrendPageSection({ className = '' }: TrendPageSectionProps) {
  return (
    <TrendPageClientSection 
      className={className}
      recommendedContent={<RecommendedContent />}
      worksRankingContent={<WorksRankingContent />}
      usersRankingContent={<UsersRankingContent />}
      announcementsContent={<AnnouncementsContent />}
    />
  );
}