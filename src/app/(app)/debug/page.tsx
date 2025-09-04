'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [result, setResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setResult('テスト中...')
    
    try {
      const supabase = createClient()
      
      // 1. 認証状態を確認
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user)
      
      // 2. worksテーブルの件数を取得
      const { data: works, error: worksError, count } = await supabase
        .from('works')
        .select('*', { count: 'exact' })
        .limit(5)
      
      console.log('Works query result:', { works, worksError, count })
      
      // 3. usersテーブルの確認
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .limit(3)
        
      console.log('Users query result:', { users, usersError })
      
      setResult(`
✅ 接続テスト完了
👤 ユーザー: ${user ? `${user.email} (${user.id})` : 'ログインなし'}
📚 作品数: ${count || 0}件
👥 ユーザー数: ${users?.length || 0}件

詳細はコンソールログを確認してください。
      `)
      
    } catch (error) {
      console.error('Debug test error:', error)
      setResult(`❌ エラー: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">デバッグページ</h1>
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Supabase接続テスト</h2>
          
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'テスト中...' : '接続テスト実行'}
          </button>
          
          {result && (
            <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm whitespace-pre-wrap">
              {result}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}