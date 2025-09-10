'use client'

import { useEffect, useState } from 'react'

/**
 * プリロードされたデータを活用するカスタムフック
 */
export function usePreloadedData<T>(url: string): T | null {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // プリロードされたデータがキャッシュにある可能性を確認
    const loadData = async () => {
      try {
        const response = await fetch(url, {
          // キャッシュ優先でリクエスト
          cache: 'force-cache'
        })
        
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.warn(`プリロードデータ取得失敗: ${url}`, error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [url])

  return { data, loading } as any
}

/**
 * 複数のAPIエンドポイントからプリロードデータを取得
 */
export function useBatchPreloadedData(urls: string[]) {
  const [dataMap, setDataMap] = useState<Record<string, any>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadAllData = async () => {
      const initialLoading = urls.reduce((acc, url) => {
        acc[url] = true
        return acc
      }, {} as Record<string, boolean>)
      
      setLoadingMap(initialLoading)

      // 並行してプリロードデータを取得
      const promises = urls.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'force-cache' })
          const data = response.ok ? await response.json() : null
          return { url, data }
        } catch (error) {
          console.warn(`プリロードデータ取得失敗: ${url}`, error)
          return { url, data: null }
        }
      })

      const results = await Promise.allSettled(promises)
      
      const newDataMap: Record<string, any> = {}
      const newLoadingMap: Record<string, boolean> = {}

      results.forEach((result, index) => {
        const url = urls[index]
        if (result.status === 'fulfilled' && result.value) {
          newDataMap[url] = result.value.data
        }
        newLoadingMap[url] = false
      })

      setDataMap(newDataMap)
      setLoadingMap(newLoadingMap)
    }

    loadAllData()
  }, [JSON.stringify(urls)])

  return { dataMap, loadingMap }
}