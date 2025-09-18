import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ForgotPasswordForm } from '@/features/auth/sections/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'パスワードリセット - Bunshare',
  description: 'パスワードを忘れた場合は、メールアドレスを入力してリセット用のリンクを受け取ってください。',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hovertext-gray-200 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ログインに戻る
        </Link>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              パスワードリセット
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              登録済みのメールアドレスを入力してください。<br />
              パスワードリセット用のリンクをお送りします。
            </p>
          </div>

          {/* Form */}
          <ForgotPasswordForm />

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              アカウントをお持ちでない場合は{' '}
              <Link
                href="/auth/signup"
                className="text-purple-600 hovertext-purple-300 transition-colors"
              >
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}