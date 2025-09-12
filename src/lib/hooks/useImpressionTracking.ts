'use client'

import { useEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'

export interface ImpressionContext {
  impressionType: 'recommendation' | 'search' | 'category' | 'trending' | 'popular' | 'new' | 'series' | 'user_works'
  pageContext: 'home' | 'search' | 'user_profile' | 'work_detail' | 'category' | 'series' | 'trending'
  position?: number
  additionalData?: Record<string, any>
}

interface ImpressionData {
  workId: string
  context: ImpressionContext
  sessionId: string
  intersectionRatio: number
  displayDuration: number
  viewportDimensions: {
    width: number
    height: number
  }
  userAgent: string
}

// セッションIDを生成・保持
const getSessionId = (() => {
  let sessionId: string | null = null
  return () => {
    if (!sessionId) {
      sessionId = nanoid()
      // セッションストレージに保存（タブ間で共有しない）
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('bunshare_session_id', sessionId)
        } catch (e) {
          // セッションストレージが使用できない場合はメモリ内で保持
        }
      }
    }
    return sessionId
  }
})()

// セッション内重複記録を防ぐ
const impressionCache = new Set<string>()

// バッチ送信用のキュー
let impressionQueue: ImpressionData[] = []
let batchTimeout: NodeJS.Timeout | null = null

// 実際の送信処理
async function sendImpressions(impressions: ImpressionData[]) {
  if (impressions.length === 0) return

  try {
    const response = await fetch('/api/impressions/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ impressions }),
    })

    if (!response.ok) {
      console.warn('Impression記録に失敗:', response.statusText)
    }
  } catch (error) {
    console.error('Impression送信エラー:', error)
  }
}

// バッチ送信処理
function batchSendImpressions(impression: ImpressionData) {
  impressionQueue.push(impression)

  if (batchTimeout) {
    clearTimeout(batchTimeout)
  }

  batchTimeout = setTimeout(() => {
    sendImpressions([...impressionQueue])
    impressionQueue = []
    batchTimeout = null
  }, 2000) // 2秒後に送信
}

// Impression記録関数
function recordImpression(
  workId: string,
  context: ImpressionContext,
  intersectionRatio: number,
  displayDuration: number
) {
  // context の存在チェック
  if (!context || typeof context !== 'object') {
    console.warn('Invalid impression context (not an object):', context)
    return
  }
  
  if (!context.impressionType || !context.pageContext) {
    console.warn('Invalid impression context (missing properties):', context)
    return
  }

  const sessionId = getSessionId()
  const cacheKey = `${sessionId}_${workId}_${context.impressionType}_${context.pageContext}`

  // セッション内重複チェック
  if (impressionCache.has(cacheKey)) {
    return
  }

  impressionCache.add(cacheKey)

  const impressionData: ImpressionData = {
    workId,
    context,
    sessionId,
    intersectionRatio,
    displayDuration,
    viewportDimensions: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent: navigator.userAgent,
  }

  batchSendImpressions(impressionData)
}

export function useImpressionTracking(
  workId: string,
  context: ImpressionContext,
  options: {
    threshold?: number // 表示割合のしきい値（0.0-1.0）
    minDuration?: number // 最小表示時間（ミリ秒）
    enabled?: boolean // 追跡の有効/無効
  } = {}
) {

  const {
    threshold = 0.5, // 50%以上
    minDuration = 1000, // 1秒以上
    enabled = true,
  } = options

  const elementRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const recordedRef = useRef(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled || !context || typeof context !== 'object' || !context.impressionType || !context.pageContext) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting && entry.intersectionRatio >= threshold

        if (isIntersecting && !startTimeRef.current) {
          // 表示開始
          setIsVisible(true)
          startTimeRef.current = Date.now()
          recordedRef.current = false
          
          // 1秒後に記録チェックするタイマーを設定
          setTimeout(() => {
            if (startTimeRef.current && !recordedRef.current) {
              const displayDuration = Date.now() - startTimeRef.current
              if (displayDuration >= minDuration) {
                recordImpression(
                  workId,
                  context,
                  0.5, // 最小しきい値を使用（正確な値は取得困難）
                  displayDuration
                )
                recordedRef.current = true
              }
            }
          }, minDuration)
        } else if (!isIntersecting && startTimeRef.current) {
          // 表示終了
          setIsVisible(false)
          startTimeRef.current = null
        }

        // 表示中で十分な時間が経過した場合に記録
        if (
          isIntersecting &&
          startTimeRef.current &&
          !recordedRef.current
        ) {
          const displayDuration = Date.now() - startTimeRef.current
          if (displayDuration >= minDuration) {
            recordImpression(
              workId,
              context,
              entry.intersectionRatio,
              displayDuration
            )
            recordedRef.current = true
          }
        }
      },
      {
        threshold: [0, threshold, 1.0],
        rootMargin: '10px', // 少し余裕を持たせる
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
      setIsVisible(false)
      startTimeRef.current = null
    }
  }, [workId, context, threshold, minDuration, enabled])

  // ページ離脱時に残りのimpressionを送信
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (impressionQueue.length > 0) {
        // 同期的に送信（ページ離脱時）
        navigator.sendBeacon(
          '/api/impressions/record',
          JSON.stringify({ impressions: impressionQueue })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return {
    ref: elementRef,
    isVisible,
    isTracking: enabled && !recordedRef.current,
  }
}