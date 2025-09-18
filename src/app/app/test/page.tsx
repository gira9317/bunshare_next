'use client'

import { useState } from 'react'
import { createTestWorkAction } from '@/features/works/server/actions'
import { useRouter } from 'next/navigation'

export default function TestPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  const handleCreateTestWork = async () => {
    setIsCreating(true)
    setResult(null)

    try {
      const response = await createTestWorkAction()
      
      if (response.success) {
        setResult(`✅ テスト作品作成完了！ID: ${response.workId}`)
        
        // 作品詳細ページに遷移
        setTimeout(() => {
          router.push(`/works/${response.workId}`)
        }, 2000)
      } else {
        setResult(`❌ エラー: ${response.error}`)
      }
    } catch (error) {
      console.error('Test work creation error:', error)
      setResult(`❌ 予期しないエラーが発生しました`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">テスト用ページ</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">作品テスト</h2>
          
          <button
            onClick={handleCreateTestWork}
            disabled={isCreating}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? '作成中...' : 'テスト作品を作成'}
          </button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-mono text-sm">{result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}