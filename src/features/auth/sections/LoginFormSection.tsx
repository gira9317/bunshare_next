'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { LoginForm } from '../schemas'
import { FormField, TextInput } from '../leaf/FormField'
import { PasswordInput } from '../leaf/PasswordInput'
import { SocialLoginButton } from '../leaf/SocialLoginButton'

export function LoginFormSection() {
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginForm, string>>>({})
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      // TODO: Server Actionを呼び出す
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        throw new Error('ログインに失敗しました')
      }
      
      // 成功時はアプリホームにリダイレクト
      window.location.href = '/app'
    } catch (error) {
      console.error('ログインエラー:', error)
      setErrors({ email: 'メールアドレスまたはパスワードが正しくありません' })
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async () => {
    setSocialLoading(true)
    setErrors({})
    
    try {
      const { signInWithGoogle } = await import('../server/actions')
      await signInWithGoogle()
    } catch (error) {
      console.error('Google ログインエラー:', error)
      setErrors({ email: 'Googleログインに失敗しました' })
      setSocialLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
      {/* ロゴ */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img 
            src="/images/logo/Bunshare_logo.png" 
            alt="Bunshare" 
            className="h-10 w-auto"
          />
          <span className="text-2xl font-bold text-gray-900">Bunshare</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ようこそ</h1>
        <p className="text-gray-600">あなたの物語を始めましょう</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="メールアドレス"
          icon={<Mail size={16} />}
          error={errors.email}
          required
        >
          <TextInput
            id="email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            placeholder="example@bunshare.jp"
            required
            error={errors.email}
          />
        </FormField>

        <FormField
          label="パスワード"
          icon={<Lock size={16} />}
          error={errors.password}
          required
        >
          <div className="space-y-2">
            <PasswordInput
              id="password"
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
              placeholder="パスワードを入力"
              required
              error={errors.password}
            />
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-purple-600 hover:text-purple-500 transition-colors"
              >
                パスワードをお忘れですか？
              </Link>
            </div>
          </div>
        </FormField>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>ログイン中...</span>
            </div>
          ) : (
            'ログイン'
          )}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">または</span>
          </div>
        </div>

        <SocialLoginButton
          provider="google"
          onClick={handleSocialLogin}
          loading={socialLoading}
        />
      </div>
    </div>
  )
}