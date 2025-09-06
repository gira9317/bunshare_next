'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { updateUserEmail } from '../server/actions'

interface EmailChangeModalProps {
  isOpen: boolean
  onClose: () => void
  currentEmail: string
}

export function EmailChangeModal({ isOpen, onClose, currentEmail }: EmailChangeModalProps) {
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await updateUserEmail({ newEmail, password })
      setSuccess(result.message || '確認メールを新しいメールアドレスに送信しました。メールを確認して変更を完了してください。')
      setNewEmail('')
      setPassword('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'メールアドレスの更新に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setNewEmail('')
    setPassword('')
    setError('')
    setSuccess('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            メールアドレス変更
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              現在のメールアドレス
            </label>
            <input
              type="email"
              value={currentEmail}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新しいメールアドレス
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="new@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              現在のパスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="現在のパスワードを入力"
            />
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-md space-y-2">
              <p className="font-medium">{success}</p>
              <div className="text-xs space-y-1">
                <p>• 新しいメールアドレスに確認メールを送信しました</p>
                <p>• メール内のリンクをクリックして変更を完了してください</p>
                <p>• メールが届かない場合は、迷惑メールフォルダも確認してください</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !newEmail || !password}
            >
              {isLoading ? '送信中...' : '変更する'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}