import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ResetPasswordForm } from '@/features/auth/sections/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'パスワード再設定 - Bunshare',
  description: '新しいパスワードを設定してください。',
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ログインに戻る
        </Link>

        {/* Main Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              パスワード再設定
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              新しいパスワードを入力してください。<br />
              安全性のため、強力なパスワードを設定してください。
            </p>
          </div>

          {/* Form */}
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}