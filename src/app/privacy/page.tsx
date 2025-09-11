'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, Shield, FileText, Cookie, Users, Lock, Mail, AlertTriangle, Database, Eye } from 'lucide-react'
import Link from 'next/link'

const privacyData = [
  {
    id: 'section1',
    title: '第1条 取得する情報',
    icon: Database,
    content: {
      subtitle: '取得する情報の種類',
      description: '当サービスでは、以下の情報を取得する場合があります。',
      items: [
        'ユーザーが登録時または利用時に入力した情報（ニックネーム、メールアドレスなど）',
        '投稿・コメント・ブックマーク等のユーザーコンテンツ',
        'アクセス時の技術情報（IPアドレス、ブラウザ情報、端末情報、リファラなど）',
        'Cookieや類似技術を通じた利用履歴、閲覧履歴等',
        '外部サービス（Googleアカウント等）を通じた認証情報'
      ]
    }
  },
  {
    id: 'section2',
    title: '第2条 情報の利用目的',
    icon: Users,
    content: {
      subtitle: '利用目的について',
      description: '取得した情報は、以下の目的で使用します。',
      items: [
        'ユーザー認証およびアカウント管理',
        '作品投稿、表示、ブックマーク等のサービス提供',
        '利用状況の把握や不正利用の防止',
        'サービス品質向上・改善のための解析',
        'ユーザーへの重要なお知らせの送付',
        '広告の配信およびその最適化（興味関心に基づく内容を含む）',
        'お問い合わせ対応',
        '法令に基づく開示請求への対応'
      ]
    }
  },
  {
    id: 'section3',
    title: '第3条 外部サービスの利用',
    icon: Shield,
    content: {
      subtitle: '外部サービスとの連携',
      description: '当サービスでは、機能提供、解析、広告配信の最適化等を目的として、以下のような外部サービスと連携する場合があります。',
      items: [
        '認証・データ管理等のクラウドサービス（Supabase等）',
        'アクセス解析やパフォーマンス改善のためのツール（Google Analytics等）',
        '広告配信・最適化を行う広告ネットワーク（Google広告等）',
        'CDNサービス（Cloudflare、Vercel等）'
      ],
      warning: {
        title: '重要',
        text: 'これらの外部サービスを通じて、一部の情報が国外に送信される場合があります。情報の取り扱いについては、各サービス提供者のプライバシーポリシーをご参照ください。'
      }
    }
  },
  {
    id: 'section4',
    title: '第4条 情報の管理',
    icon: Lock,
    content: {
      subtitle: 'セキュリティ対策',
      description: '取得した情報は、適切な安全対策のもとで管理され、外部からの不正アクセスや漏洩・改ざん等を防ぐための措置を講じます。',
      highlight: '具体的には、SSL/TLS暗号化通信、アクセス制限、定期的なセキュリティ監査等を実施しています。'
    }
  },
  {
    id: 'section5',
    title: '第5条 ユーザーの権利',
    icon: Eye,
    content: {
      subtitle: 'あなたの権利',
      description: 'ユーザーは、自身の個人情報について、以下の権利を有します：',
      items: [
        '個人情報の開示請求',
        '個人情報の訂正・追加・削除',
        '個人情報の利用停止',
        '個人情報の第三者提供の停止'
      ],
      note: 'これらのご要望がある場合は、お問い合わせフォームよりご連絡ください。'
    }
  },
  {
    id: 'section6',
    title: '第6条 Cookie等の技術',
    icon: Cookie,
    content: {
      subtitle: 'Cookie等の技術について',
      description: '当サービスでは、ユーザーの利便性向上およびサービス改善のために、Cookie等の技術を使用する場合があります。',
      cookieUsage: {
        title: 'Cookieは以下の目的で使用されます：',
        items: [
          'ログイン状態の維持',
          'ユーザー設定（テーマ、言語等）の保存',
          'セキュリティの向上',
          '利用状況の分析'
        ]
      },
      note: 'ユーザーはブラウザの設定によりCookieの使用を制限または無効にすることができますが、一部機能がご利用いただけなくなる場合があります。'
    }
  },
  {
    id: 'section7',
    title: '第7条 ポリシーの変更',
    icon: FileText,
    content: {
      subtitle: 'ポリシーの更新',
      description: '本ポリシーの内容は、法令の改正、サービスの変更、その他の事情により、必要に応じて予告なく変更されることがあります。',
      highlight: '変更後のポリシーは当サービス上に掲載された時点で効力を生じます。重要な変更がある場合は、サービス内でお知らせいたします。'
    }
  },
  {
    id: 'section8',
    title: '第8条 児童のプライバシー',
    icon: Users,
    content: {
      subtitle: '13歳未満の利用について',
      description: '当サービスは13歳未満の児童による利用を想定しておりません。',
      highlight: '13歳未満の児童から個人情報を意図的に収集することはありません。もし13歳未満の児童が個人情報を提供したことが判明した場合、速やかに削除いたします。'
    }
  }
]

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('section1')
  const [readSections, setReadSections] = useState<string[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            if (!readSections.includes(entry.target.id)) {
              setReadSections(prev => [...prev, entry.target.id])
            }
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    privacyData.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [readSections])

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">ホームに戻る</span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>進捗: {readSections.length}/{privacyData.length}</span>
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-900 dark:bg-gray-100 transition-all duration-500"
                  style={{ width: `${(readSections.length / privacyData.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* ヒーローセクション */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              プライバシーポリシー
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            お客様の個人情報の取り扱いについて
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            最終更新日: 2025年1月10日
          </p>
        </div>

        {/* 重要な注意事項 */}
        <div className="mb-12 bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                個人情報保護への取り組み
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Bunshare（以下「当サービス」）は、ユーザーの個人情報の重要性を認識し、その保護に最大限の注意を払っています。当サービスをご利用いただく際に取得する情報と、その利用目的、管理方法等について以下のとおり定めます。
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* サイドナビゲーション */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* 目次 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 bg-gray-900 dark:bg-gray-100">
                  <h2 className="text-white dark:text-gray-900 font-semibold">目次</h2>
                </div>
                <nav className="p-2">
                  {privacyData.map(({ id, title, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        activeSection === id
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium flex-1">{title}</span>
                      {readSections.includes(id) && (
                        <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        activeSection === id ? 'rotate-90' : ''
                      }`} />
                    </button>
                  ))}
                </nav>
              </div>

            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              {privacyData.map(({ id, title, icon: Icon, content }) => (
                <section
                  key={id}
                  id={id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {title}
                      </h2>
                      {readSections.includes(id) && (
                        <div className="ml-auto">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {content.subtitle}
                      </h3>
                      
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {content.description}
                      </p>

                      {content.items && (
                        <ul className="space-y-2">
                          {content.items.map((item, index) => (
                            <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {content.cookieUsage && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {content.cookieUsage.title}
                          </h4>
                          <ul className="space-y-2">
                            {content.cookieUsage.items.map((item, index) => (
                              <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {content.highlight && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
                          <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                            {content.highlight}
                          </p>
                        </div>
                      )}

                      {content.warning && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-400">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                                {content.warning.title}
                              </h4>
                              <p className="text-yellow-700 dark:text-yellow-300 text-sm leading-relaxed">
                                {content.warning.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {content.note && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          {content.note}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {/* お問い合わせセクション */}
            <div className="mt-12 bg-gray-100 dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    お問い合わせ
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  当サービスに関する個人情報の取り扱いについてのお問い合わせは、以下よりご連絡ください。
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Bunshare運営事務局
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    お問い合わせフォームよりご連絡ください
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    お問い合わせフォーム
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    ホームに戻る
                  </Link>
                </div>
              </div>
            </div>

            {/* 同意に関する注記 */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bunshareをご利用いただくことで、このプライバシーポリシーに同意したものとみなされます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

