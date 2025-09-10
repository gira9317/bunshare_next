'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Mail, Send, Loader2, CheckCircle, AlertCircle, MessageCircle, HelpCircle, Bug, Lightbulb, Shield, User, Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const categoryOptions = [
  { value: 'bug', label: '不具合・エラー報告', icon: Bug },
  { value: 'feature', label: '機能改善・新機能要望', icon: Lightbulb },
  { value: 'copyright', label: '著作権関連', icon: Shield },
  { value: 'account', label: 'アカウント・ログイン', icon: User },
  { value: 'content', label: 'コンテンツに関する相談', icon: MessageCircle },
  { value: 'other', label: 'その他', icon: HelpCircle }
]

const faqData = [
  {
    question: 'アカウントにログインできません',
    answer: 'パスワードをお忘れの場合は、ログインページの「パスワードを忘れた方」からリセットをお試しください。それでも解決しない場合は、お問い合わせフォームからご連絡ください。',
    category: 'account'
  },
  {
    question: '投稿した作品を編集・削除したい',
    answer: '作品の編集・削除は、ログイン後にプロフィールページから行えます。公開済みの作品も編集可能です。',
    category: 'content'
  },
  {
    question: '著作権について',
    answer: '投稿される作品は、投稿者ご自身が著作権を持つオリジナル作品のみとさせていただいております。他者の作品の転載はご遠慮ください。',
    category: 'copyright'
  },
  {
    question: 'スマートフォンで正しく表示されません',
    answer: 'ブラウザのキャッシュをクリアしていただくか、ページを再読み込みしてお試しください。問題が続く場合はお問い合わせください。',
    category: 'bug'
  },
  {
    question: 'ブックマーク機能の使い方',
    answer: '作品カードの「...」メニューからブックマークできます。ブックマークした作品は、プロフィールページの「ライブラリ」タブから確認できます。',
    category: 'feature'
  },
  {
    question: '通知が来ない・遅い',
    answer: 'プロフィールページの「設定」タブから通知設定をご確認ください。メール通知も設定できます。',
    category: 'feature'
  }
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    device: '',
    category: '',
    message: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [searchTerm, setSearchTerm] = useState('')

  // デバイス情報を自動取得とユーザー情報の自動入力
  useEffect(() => {
    const initializeForm = async () => {
      // デバイス情報を自動取得
      const platform = navigator.platform
      const userAgent = navigator.userAgent
      
      let device = ''
      
      // モバイル判定
      if (/iPhone/i.test(userAgent)) {
        device = 'iPhone'
      } else if (/iPad/i.test(userAgent)) {
        device = 'iPad'
      } else if (/Android/i.test(userAgent)) {
        device = 'Android'
      } else if (/Mac/i.test(platform)) {
        device = 'Mac'
      } else if (/Win/i.test(platform)) {
        device = 'Windows PC'
      } else if (/Linux/i.test(platform)) {
        device = 'Linux PC'
      } else {
        device = 'デスクトップPC'
      }
      
      // ブラウザ情報を追加
      let browser = ''
      if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
        browser = 'Chrome'
      } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
        browser = 'Safari'
      } else if (/Firefox/i.test(userAgent)) {
        browser = 'Firefox'
      } else if (/Edge/i.test(userAgent)) {
        browser = 'Edge'
      }
      
      const deviceString = browser ? `${device} (${browser})` : device
      
      // ログインユーザー情報を取得
      const supabase = createClient()
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (!error && user) {
          // プロフィール情報を取得
          const { data: profile } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', user.id)
            .single()
          
          setFormData(prev => ({
            ...prev,
            device: deviceString,
            name: profile?.name || user.user_metadata?.name || '',
            email: profile?.email || user.email || ''
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            device: deviceString
          }))
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        // エラーが発生してもデバイス情報だけは設定
        setFormData(prev => ({
          ...prev,
          device: deviceString
        }))
      }
    }

    initializeForm()
  }, [])

  const filteredFAQ = faqData.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category === searchTerm
  )

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'お名前を入力してください'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'お問い合わせ内容を入力してください'
    } else if (formData.message.length > 2000) {
      newErrors.message = '2000文字以内で入力してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // TODO: Supabaseへの送信処理を実装
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setSubmitStatus('success')
      setFormData({
        name: '',
        email: '',
        device: '',
        category: '',
        message: ''
      })
    } catch (error) {
      console.error('送信エラー:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const selectedCategory = categoryOptions.find(opt => opt.value === formData.category)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">ホームに戻る</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* ヒーローセクション */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-gray-900 dark:bg-gray-100 rounded-xl shadow-lg">
              <Mail className="w-8 h-8 text-white dark:text-gray-900" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                お問い合わせ
              </h1>
            </div>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4">
            ご質問やご要望がございましたら、お気軽にお問い合わせください
          </p>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-500">
            <p>お使いいただいた感想、気になったこと、どんな些細なことでもお聞かせください。</p>
            <p>「ここがイマイチ」「これ不便」「もっとこうしてほしい」など、本音のご意見をぜひお寄せください。開発者が全部読みます！</p>
          </div>
        </div>

        {/* 成功・エラーメッセージ */}
        {submitStatus === 'success' && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">送信完了</h3>
                <p className="text-green-700 dark:text-green-300">お問い合わせを受け付けました。通常1-3営業日以内に回答いたします。</p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">送信エラー</h3>
                <p className="text-red-700 dark:text-red-300">送信に失敗しました。時間をおいて再度お試しください。</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* お問い合わせフォーム */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  お問い合わせフォーム
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* お名前 */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 dark:text-white">
                    お名前（ニックネーム可）
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="例：ブンシェア太郎"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                      errors.name 
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* メールアドレス */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 dark:text-white">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                      errors.email 
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    返信が必要な場合はご入力ください
                  </p>
                  {errors.email && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* 使用機種 */}
                <div className="space-y-2">
                  <label htmlFor="device" className="block text-sm font-semibold text-gray-900 dark:text-white">
                    使用機種・デバイス
                  </label>
                  <input
                    type="text"
                    id="device"
                    name="device"
                    value={formData.device}
                    onChange={handleChange}
                    placeholder="例：iPhone 15 Pro、Windows PC、MacBook Air M2 等"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    不具合報告の際は、ご使用の機種やデバイス情報をお書きください
                  </p>
                </div>

                {/* お問い合わせ種別 */}
                <div className="space-y-2">
                  <label htmlFor="category" className="block text-sm font-semibold text-gray-900 dark:text-white">
                    お問い合わせ種別
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: option.value }))}
                        className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                          formData.category === option.value
                            ? 'border-gray-900 bg-gray-100 dark:border-gray-100 dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-900'
                        }`}
                      >
                        <option.icon className={`w-5 h-5 ${
                          formData.category === option.value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          formData.category === option.value 
                            ? 'text-gray-900 dark:text-gray-100' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* お問い合わせ内容 */}
                <div className="space-y-2">
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-900 dark:text-white">
                    お問い合わせ内容
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    placeholder={`具体的な内容をご記入ください。
不具合報告の場合は、以下の情報もあわせてお書きいただけると助かります：
・ご利用のブラウザ（Chrome、Safari等）
・発生した状況や手順
・エラーメッセージ（もしあれば）`}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none ${
                      errors.message 
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
                  />
                  <div className="flex justify-between items-center">
                    {errors.message && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.message}
                      </p>
                    )}
                    <p className={`text-xs ml-auto ${
                      formData.message.length > 1800 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formData.message.length} / 2000文字
                    </p>
                  </div>
                </div>

                {/* 送信ボタン */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-gray-100 dark:hover:bg-gray-200 dark:disabled:bg-gray-600 text-white dark:text-gray-900 disabled:text-gray-300 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Send className="w-6 h-6" />
                        送信する
                      </>
                    )}
                  </button>
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    送信いただいた内容は、お問い合わせ対応のためにのみ使用いたします。
                    <br />
                    通常1-3営業日以内に回答いたします。
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* よくある質問 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  よくある質問
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="質問を検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  />
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="p-2 space-y-2">
                  {filteredFAQ.map((faq, index) => (
                    <details key={index} className="group">
                      <summary className="flex items-center gap-3 p-4 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                          {faq.question}
                        </span>
                        <ChevronLeft className="w-4 h-4 text-gray-400 transform transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="px-4 pb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-8">
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
                
                {filteredFAQ.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      該当する質問が見つかりませんでした
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* フッターリンク */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              利用規約
            </Link>
            <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              プライバシーポリシー
            </Link>
            <Link href="/help" className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              ヘルプ
            </Link>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-4">
            © 2025 Bunshare. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

