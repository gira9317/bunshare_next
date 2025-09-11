'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Mail, ArrowRight, RefreshCw } from 'lucide-react'

export default function ConfirmPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorMessage = searchParams.get('message')

    if (success === 'true') {
      setStatus('success')
      setMessage('メールアドレスの確認が完了しました！')
    } else if (error) {
      setStatus('error')
      switch (error) {
        case 'confirmation_failed':
          setMessage(errorMessage || 'メールの確認に失敗しました')
          break
        case 'confirmation_exception':
          setMessage('確認処理中にエラーが発生しました')
          break
        case 'no_code':
          setMessage('確認コードが提供されていません')
          break
        default:
          setMessage('メールの確認に失敗しました')
      }
    } else {
      // デフォルトでは成功と仮定
      setStatus('success')
      setMessage('メールアドレスの確認が完了しました！')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
        {/* ロゴ */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src="/images/logo/Bunshare_logo.png" 
            alt="Bunshare" 
            className="h-10 w-auto"
          />
          <span className="text-2xl font-bold text-gray-900">Bunshare</span>
        </div>

        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">確認中...</h1>
            <p className="text-gray-600">
              メールアドレスの確認を処理しています
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">確認完了！</h1>
            <p className="text-gray-600 mb-8">
              {message}
              <br />
              アカウントが有効化されました。
            </p>
            <div className="space-y-4">
              <Link
                href="/auth/login"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
              >
                <span>ログインして始める</span>
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/"
                className="w-full text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>ホームページに戻る</span>
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">確認に失敗しました</h1>
            <p className="text-gray-600 mb-8">
              {message}
            </p>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">
                      メールを確認してください
                    </h3>
                    <p className="text-sm text-yellow-700">
                      確認メール内のリンクを正しくクリックしたか確認してください。リンクの有効期限が切れている可能性があります。
                    </p>
                  </div>
                </div>
              </div>
              
              <Link
                href="/auth/signup"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                <span>再度サインアップする</span>
              </Link>
              
              <Link
                href="/auth/login"
                className="w-full text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>既にアカウントをお持ちの場合はログイン</span>
              </Link>
            </div>
          </>
        )}

        {/* フッター */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            ご不明な点がございましたら{' '}
            <Link href="/contact" className="text-purple-600 hover:text-purple-500 underline">
              お問い合わせ
            </Link>{' '}
            ください
          </p>
        </div>
      </div>
    </div>
  )
}

