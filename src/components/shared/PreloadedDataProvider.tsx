'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface PreloadedDataContextType {
  recommendations: any
  novels: any
  essays: any
  userTags: any
  isLoading: boolean
}

const PreloadedDataContext = createContext<PreloadedDataContextType | null>(null)

interface PreloadedDataProviderProps {
  children: React.ReactNode
  user?: any
}

export function PreloadedDataProvider({ children, user }: PreloadedDataProviderProps) {
  const [preloadedData, setPreloadedData] = useState<PreloadedDataContextType>({
    recommendations: null,
    novels: null,
    essays: null,
    userTags: null,
    isLoading: true
  })

  useEffect(() => {
    const loadPreloadedData = async () => {
      console.log('🚀 [DEBUG] プリロードデータ取得開始')
      
      // プリロード対象のエンドポイント
      const endpoints = [
        '/api/recommendations',
        '/api/novels', 
        '/api/essays'
      ]

      // ユーザーがいる場合はユーザータグも含める
      if (user) {
        endpoints.push('/api/user-tags')
      }

      try {
        // 並行してプリロードされたデータを取得
        const responses = await Promise.allSettled(
          endpoints.map(async (url) => {
            const response = await fetch(url, {
              cache: 'force-cache', // プリロードされたキャッシュを優先利用
              headers: {
                'X-Preloaded': 'true' // プリロード識別用ヘッダー
              }
            })
            
            if (!response.ok) {
              throw new Error(`Failed to fetch ${url}: ${response.status}`)
            }
            
            const data = await response.json()
            return { url, data }
          })
        )

        const newData: any = {
          recommendations: null,
          novels: null,
          essays: null,
          userTags: null,
          isLoading: false
        }

        responses.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { url, data } = result.value
            
            switch (url) {
              case '/api/recommendations':
                newData.recommendations = data
                break
              case '/api/novels':
                newData.novels = data
                break
              case '/api/essays':
                newData.essays = data
                break
              case '/api/user-tags':
                newData.userTags = data
                break
            }
            
            console.log(`✅ [DEBUG] プリロードデータ取得成功: ${url}`)
          } else {
            console.warn(`❌ [DEBUG] プリロードデータ取得失敗: ${endpoints[index]}`, result.reason)
          }
        })

        setPreloadedData(newData)
        console.log('🎉 [DEBUG] プリロードデータ統合完了')
        
      } catch (error) {
        console.error('プリロードデータ取得エラー:', error)
        setPreloadedData(prev => ({ ...prev, isLoading: false }))
      }
    }

    // 少し遅延させてプリロードの恩恵を受ける
    const timer = setTimeout(loadPreloadedData, 50)
    return () => clearTimeout(timer)
  }, [user?.id])

  return (
    <PreloadedDataContext.Provider value={preloadedData}>
      {children}
    </PreloadedDataContext.Provider>
  )
}

export function usePreloadedData() {
  const context = useContext(PreloadedDataContext)
  if (!context) {
    throw new Error('usePreloadedData must be used within a PreloadedDataProvider')
  }
  return context
}