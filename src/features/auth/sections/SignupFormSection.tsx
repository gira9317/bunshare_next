'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Mail, Lock, Calendar, Users, Shield, UserCheck } from 'lucide-react'
import { SignupForm } from '../schemas'
import { PasswordValidation } from '../types'
import { FormField, TextInput, SelectInput } from '../leaf/FormField'
import { PasswordInput } from '../leaf/PasswordInput'
import { SocialLoginButton } from '../leaf/SocialLoginButton'

export function SignupFormSection() {
  const [formData, setFormData] = useState<SignupForm>({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    birthDate: '',
    gender: null,
    agreeTerms: false,
    agreeMarketing: false,
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignupForm, string>>>({})
  const [loading, setLoading] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasNumber: false,
    hasLetter: false,
    isValid: false,
  })

  const validatePassword = (password: string): PasswordValidation => {
    const hasMinLength = password.length >= 8
    const hasNumber = /\d/.test(password)
    const hasLetter = /[A-Za-z]/.test(password)
    const isValid = hasMinLength && hasNumber && hasLetter

    return { hasMinLength, hasNumber, hasLetter, isValid }
  }

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value })
    setPasswordValidation(validatePassword(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // バリデーションエラーの処理
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors({ email: data.error || 'アカウントの作成に失敗しました' })
        }
        return
      }
      
      // 成功時の処理
      if (data.requiresConfirmation) {
        // メール確認が必要な場合はメッセージを表示して待機
        alert(`${data.message}\n\nメール内のリンクをクリックしてアカウントを有効化してください。`)
        // フォームをリセット
        setFormData({
          username: '',
          email: '',
          password: '',
          passwordConfirm: '',
          birthDate: '',
          gender: null,
          agreeTerms: false,
          agreeMarketing: false,
        })
      } else {
        // 即座にログイン完了の場合
        alert(data.message)
        window.location.href = '/'
      }
    } catch (error) {
      console.error('サインアップエラー:', error)
      setErrors({ email: 'アカウントの作成に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = () => {
    console.log('Google サインアップ')
  }

  const passwordsMatch = formData.password === formData.passwordConfirm

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">新規登録</h1>
        <p className="text-gray-600">アカウントを作成して始めましょう</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="ユーザー名（表示名）"
          icon={<User size={16} />}
          error={errors.username}
          required
          helpText="公開される名前です。後から変更できます。"
        >
          <TextInput
            id="username"
            value={formData.username}
            onChange={(value) => setFormData({ ...formData, username: value })}
            placeholder="山田 太郎"
            required
            error={errors.username}
          />
        </FormField>

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
          <PasswordInput
            id="password"
            value={formData.password}
            onChange={handlePasswordChange}
            placeholder="パスワードを入力"
            required
            showValidation
            validation={passwordValidation}
            error={errors.password}
          />
        </FormField>

        <FormField
          label="パスワード確認"
          icon={<Lock size={16} />}
          error={errors.passwordConfirm}
          required
        >
          <div className="space-y-2">
            <PasswordInput
              id="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={(value) => setFormData({ ...formData, passwordConfirm: value })}
              placeholder="再度パスワードを入力"
              required
              error={errors.passwordConfirm}
            />
            {formData.passwordConfirm && (
              <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-1 h-1 rounded-full ${passwordsMatch ? 'bg-green-600' : 'bg-red-600'}`} />
                {passwordsMatch ? 'パスワードが一致します' : 'パスワードが一致しません'}
              </div>
            )}
          </div>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="生年月日"
            icon={<Calendar size={16} />}
            error={errors.birthDate}
            required
          >
            <TextInput
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(value) => setFormData({ ...formData, birthDate: value })}
              placeholder=""
              required
              error={errors.birthDate}
            />
          </FormField>

          <FormField
            label="性別"
            icon={<Users size={16} />}
            error={errors.gender}
          >
            <SelectInput
              id="gender"
              value={formData.gender || ''}
              onChange={(value) => setFormData({ ...formData, gender: value as any })}
              error={errors.gender}
            >
              <option value="">選択してください</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
              <option value="prefer-not-to-say">回答しない</option>
            </SelectInput>
          </FormField>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={formData.agreeTerms}
              onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
              className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-secondary)'
              }}
              required
            />
            <label htmlFor="agreeTerms" className="text-sm" style={{ color: 'var(--text-primary)' }}>
              <Link href="/terms" target="_blank" className="text-purple-600 hover:text-purple-500 underline">
                利用規約
              </Link>
              と
              <Link href="/privacy" target="_blank" className="text-purple-600 hover:text-purple-500 underline">
                プライバシーポリシー
              </Link>
              に同意する
            </label>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeMarketing"
              checked={formData.agreeMarketing}
              onChange={(e) => setFormData({ ...formData, agreeMarketing: e.target.checked })}
              className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-secondary)'
              }}
            />
            <label htmlFor="agreeMarketing" className="text-sm" style={{ color: 'var(--text-primary)' }}>
              お得な情報やアップデート情報をメールで受け取る（任意）
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.agreeTerms}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>アカウント作成中...</span>
            </>
          ) : (
            <>
              <UserCheck size={20} />
              <span>アカウントを作成</span>
            </>
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
          loading={false}
        />
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          すでにアカウントをお持ちの方は{' '}
          <Link
            href="/auth/login"
            className="text-purple-600 hover:text-purple-500 font-medium transition-colors"
          >
            ログイン
          </Link>
        </p>
      </div>

      {/* セキュリティ情報 */}
      <div className="mt-8 p-4 bg-gray-50/50 rounded-xl">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Shield size={14} />
            <span>SSL暗号化通信で個人情報を保護</span>
          </div>
          <div className="flex items-center gap-1">
            <UserCheck size={14} />
            <span>厳格なプライバシー保護</span>
          </div>
        </div>
      </div>
    </div>
  )
}