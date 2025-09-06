'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle } from 'lucide-react'
import { forgotPasswordAction } from '../server/actions'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    const formData = new FormData()
    formData.append('email', email)

    try {
      const result = await forgotPasswordAction(formData)
      
      if (result?.errors) {
        setErrors(result.errors)
      } else if (result?.success) {
        setSuccess(true)
      }
    } catch (error) {
      setErrors({
        _form: ['予期しないエラーが発生しました。もう一度お試しください。']
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          メールを送信しました
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <span className="font-medium text-gray-900 dark:text-white">{email}</span><br />
          にパスワードリセット用のリンクを送信しました。<br />
          メールをご確認ください。
        </p>
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* General Error */}
      {errors._form && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors._form[0]}
          </p>
        </div>
      )}

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          メールアドレス
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`
              w-full pl-10 pr-3 py-3 border rounded-lg
              bg-white dark:bg-gray-700 
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              focus:ring-2 focus:ring-purple-500 focus:border-transparent
              transition-all duration-200
              ${errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}
            `}
            placeholder="example@email.com"
            required
            disabled={isLoading}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.email[0]}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading || !email.trim()}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            送信中...
          </div>
        ) : (
          'リセット用リンクを送信'
        )}
      </Button>
    </form>
  )
}