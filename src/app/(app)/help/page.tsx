import { ChevronRight, Book, MessageCircle, Shield, Mail, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ヘルプセンター
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bunshareの使い方やよくある質問をご覧いただけます
          </p>
        </div>

        {/* クイックアクセス */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Link href="/works/create" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Book className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      作品を投稿する
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      新しい作品を作成・公開
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/trends" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      トレンドを見る
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      人気の作品を探す
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          </Link>
        </div>

        {/* よくある質問 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            よくある質問
          </h2>
          <div className="space-y-4">
            <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="font-medium text-gray-900 dark:text-white">
                  作品を投稿するにはどうすればよいですか？
                </span>
              </summary>
              <div className="px-6 pb-4 text-gray-600 dark:text-gray-400">
                <ol className="list-decimal list-inside space-y-2">
                  <li>ログイン後、画面上部の「新規作成」ボタンをクリック</li>
                  <li>タイトル、カテゴリー、本文を入力</li>
                  <li>必要に応じてタグや画像を追加</li>
                  <li>「公開」または「下書き保存」を選択</li>
                </ol>
              </div>
            </details>

            <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="font-medium text-gray-900 dark:text-white">
                  ブックマークとはなんですか？
                </span>
              </summary>
              <div className="px-6 pb-4 text-gray-600 dark:text-gray-400">
                ブックマークは、後で読みたい作品を保存する機能です。
                作品カードの「...」メニューからブックマークできます。
                ブックマークした作品は、プロフィールページの「ライブラリ」タブから確認できます。
                フォルダを作成して整理することも可能です。
              </div>
            </details>

            <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="font-medium text-gray-900 dark:text-white">
                  シリーズ機能の使い方を教えてください
                </span>
              </summary>
              <div className="px-6 pb-4 text-gray-600 dark:text-gray-400">
                シリーズ機能を使うと、複数の作品を連続したストーリーとして管理できます。
                作品投稿時に「シリーズに追加」を選択し、新規シリーズを作成するか既存のシリーズを選択してください。
                読者はシリーズ単位で作品を追いかけることができます。
              </div>
            </details>

            <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="font-medium text-gray-900 dark:text-white">
                  プライバシー設定はどこから変更できますか？
                </span>
              </summary>
              <div className="px-6 pb-4 text-gray-600 dark:text-gray-400">
                プロフィールページの「設定」タブから、以下の設定を変更できます：
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>プロフィールの公開/非公開</li>
                  <li>フォロー承認制の有効/無効</li>
                  <li>通知設定（いいね、コメント、フォロー）</li>
                  <li>メール通知の設定</li>
                </ul>
              </div>
            </details>

            <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="font-medium text-gray-900 dark:text-white">
                  作品の削除はできますか？
                </span>
              </summary>
              <div className="px-6 pb-4 text-gray-600 dark:text-gray-400">
                はい、自分の作品は削除できます。
                プロフィールページの「作品管理」タブから、削除したい作品の「編集」ボタンをクリックし、
                編集画面の最下部にある「作品を削除」ボタンから削除できます。
                削除した作品は復元できませんのでご注意ください。
              </div>
            </details>
          </div>
        </section>

        {/* 使い方ガイド */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            使い方ガイド
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                初めての方へ
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>アカウントを作成してログイン</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>プロフィールを設定</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>興味のある作品を探して読む</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>気に入った作品にいいねやコメント</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                作品を投稿する
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>「新規作成」から投稿画面へ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>下書き保存で後から編集可能</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>タグを追加して見つけやすく</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span>シリーズ機能で連載も可能</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* お問い合わせ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            お問い合わせ
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                ご不明な点がございましたら、お気軽にお問い合わせください
              </span>
            </div>
            <a
              href="mailto:support@bunshare.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              お問い合わせメールを送る
            </a>
          </div>
        </section>

        {/* 利用規約・プライバシーポリシー */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            規約・ポリシー
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/terms" className="group">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      利用規約
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
              </div>
            </Link>

            <Link href="/privacy" className="group">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      プライバシーポリシー
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'ヘルプ - Bunshare',
  description: 'Bunshareの使い方やよくある質問をご覧いただけます。'
}