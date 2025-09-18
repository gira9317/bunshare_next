'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, Shield, Scale, Users } from 'lucide-react'
import Link from 'next/link'

const termsData = [
  {
    id: 'article1',
    title: '第1条 総則',
    icon: Scale,
    content: 'ユーザーがBunshare（以下「本サービス」といいます）を利用するにあたり、Bunshare運営者（以下「運営者」）との間で適用される条件を定めるものです。ユーザーは本規約に同意の上、本サービスを利用するものとします。'
  },
  {
    id: 'article2', 
    title: '第2条 定義',
    icon: Users,
    content: [
      '「ユーザー」とは、本規約に同意のうえ、本サービスに登録し、利用するすべての個人または法人を指します。',
      '「投稿コンテンツ」とは、ユーザーが本サービス上に投稿・アップロードしたテキスト、画像、音声、動画、その他のデータを指します。'
    ]
  },
  {
    id: 'article3',
    title: '第3条 アカウント登録', 
    icon: Users,
    content: [
      'ユーザーは、正確かつ最新の情報を用いてアカウントを登録するものとします。',
      'アカウントはユーザー本人が管理するものとし、第三者への譲渡・貸与・共有を行ってはなりません。',
      '運営者は、不正行為や虚偽情報が認められた場合、アカウントの停止または削除を行うことがあります。',
      { text: '本サービスの利用は13歳以上のユーザーに限られます。18歳未満のユーザーは、親権者または保護者の同意を得た上で利用するものとします。', highlight: true }
    ]
  },
  {
    id: 'article4',
    title: '第4条 著作権およびコンテンツ利用',
    icon: Shield,
    content: [
      '投稿コンテンツの著作権は、当該コンテンツを投稿したユーザーに帰属します。',
      {
        text: 'ユーザーは、運営者が以下の目的で投稿コンテンツを無償で利用することを許諾します：',
        subItems: [
          'サービスの提供・運営・改善・プロモーション',
          '提携先サービスや外部メディアにおける紹介・展示'
        ]
      },
      '投稿コンテンツが書籍化、映像化、その他商業的に利用される場合で、運営者が当該事業に関与しない限り、運営者は一切の手数料や報酬を請求しません。',
      { text: '将来的に運営者が、投稿コンテンツをもとに音声読み上げ、短尺映像化、その他新たな形式の二次コンテンツを本サービス内または関連サービス上で提供する可能性があります。', highlight: true },
      'ユーザーは、投稿コンテンツが自己の創作によるものであり、第三者の著作権その他の権利を侵害しないことを保証するものとします。',
      { text: '本サービスでは、他者が著作権を有するコンテンツの転載を一切禁止します。運営者が転載等の事実を確認した場合、当該コンテンツを削除し、必要に応じて当該ユーザーの利用停止措置を行うことがあります。', warning: true },
      'ユーザーの投稿に起因して第三者との間に紛争が生じた場合、当該ユーザーの責任と費用負担においてこれを解決するものとします。'
    ]
  },
  {
    id: 'article5',
    title: '第5条 禁止行為',
    icon: Shield,
    content: [
      'ユーザーは以下の行為を行ってはなりません：',
      '法令または公序良俗に違反する行為',
      '他者の著作権、肖像権、プライバシーその他の権利を侵害する行為', 
      '差別的・誹謗中傷的表現、暴力的表現、アダルトコンテンツの投稿',
      '本サービスの運営を妨げる行為、不正アクセス、スパム等の迷惑行為',
      'その他、運営者が不適切と判断する行為'
    ]
  }
]

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('article1')
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

    termsData.forEach(({ id }) => {
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

  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      return <p className="text-gray-700 leading-relaxed">{content}</p>
    }

    if (Array.isArray(content)) {
      return (
        <div className="space-y-4">
          {content.map((item, index) => (
            <div key={index}>
              {typeof item === 'string' ? (
                <p className="text-gray-700 leading-relaxed">
                  {index === 0 && content[0].includes('：') ? (
                    <span className="font-medium">{item}</span>
                  ) : (
                    `${index > 0 && !item.includes('：') ? `${index}. ` : ''}${item}`
                  )}
                </p>
              ) : (
                <div className={`p-4 rounded-lg border-l-4 ${
                  item.highlight ? 'bg-purple-50 border-purple-400' :
                  item.warning ? 'bg-red-50 border-red-400' :
                  'bg-gray-50 border-gray-400'
                }`}>
                  <p className={`leading-relaxed ${
                    item.highlight ? 'text-purple-800' :
                    item.warning ? 'text-red-800' :
                    'text-gray-700'
                  }`}>
                    {item.text}
                  </p>
                  {item.subItems && (
                    <ul className="mt-3 ml-4 space-y-1">
                      {item.subItems.map((subItem: string, subIndex: number) => (
                        <li key={subIndex} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-purple-500 mt-1">•</span>
                          {subItem}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hovertext-gray-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">ホームに戻る</span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>進捗: {readSections.length}/{termsData.length}</span>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-900 transition-all duration-500"
                  style={{ width: `${(readSections.length / termsData.length) * 100}%` }}
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
            <h1 className="text-4xl font-bold text-gray-900">
              利用規約
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Bunshareをご利用いただくにあたっての重要な規約です
          </p>
          <p className="text-sm text-gray-500 mt-4">
            最終更新日: 2025年1月10日
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* サイドナビゲーション */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-900">
                  <h2 className="text-white font-semibold">目次</h2>
                </div>
                <nav className="p-2">
                  {termsData.map(({ id, title, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        activeSection === id
                          ? 'bg-gray-200 text-gray-900'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-sm font-medium flex-1">{title}</span>
                      {readSections.includes(id) && (
                        <Check className="w-4 h-4 text-gray-500" />
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
              {termsData.map(({ id, title, icon: Icon, content }, index) => (
                <section
                  key={id}
                  id={id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {title}
                      </h2>
                      {readSections.includes(id) && (
                        <div className="ml-auto">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-gray-600" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="prose prose-gray max-w-none">
                      {renderContent(content)}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {/* お問い合わせセクション */}
            <div className="mt-12 bg-gray-100 rounded-xl p-8 border border-gray-200">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  ご不明な点がございましたら
                </h3>
                <p className="text-gray-600 mb-6">
                  利用規約に関してご質問やご不明な点がございましたら、お気軽にお問い合わせください。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    お問い合わせ
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-md hover:shadow-lg"
                  >
                    ホームに戻る
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

