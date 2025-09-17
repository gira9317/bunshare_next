'use client'

import { useState, useEffect } from 'react'

export interface ProgressiveHydrationConfig {
  /**
   * 段階的な有効化までの遅延時間（ミリ秒）
   */
  delayMs?: number
  
  /**
   * ビューポートに入ったときのみ有効化
   */
  enableOnVisible?: boolean
  
  /**
   * ユーザー操作があったときのみ有効化
   */
  enableOnInteraction?: boolean
  
  /**
   * アイドル時間後に有効化
   */
  enableOnIdle?: boolean
}

/**
 * プログレッシブハイドレーション用フック
 * 段階的にクライアント機能を有効化して初期パフォーマンスを向上
 */
export function useProgressiveHydration(config: ProgressiveHydrationConfig = {}) {
  const {
    delayMs = 2000,
    enableOnVisible = false,
    enableOnInteraction = false,
    enableOnIdle = false
  } = config

  const [isHydrated, setIsHydrated] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  // 基本的な遅延有効化
  useEffect(() => {
    if (!enableOnVisible && !enableOnInteraction && !enableOnIdle) {
      const timer = setTimeout(() => {
        setIsHydrated(true)
      }, delayMs)
      
      return () => clearTimeout(timer)
    }
  }, [delayMs, enableOnVisible, enableOnInteraction, enableOnIdle])

  // ビューポート監視
  useEffect(() => {
    if (!enableOnVisible) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    // ルート要素を監視
    const root = document.documentElement
    observer.observe(root)

    return () => observer.disconnect()
  }, [enableOnVisible])

  // ユーザー操作監視
  useEffect(() => {
    if (!enableOnInteraction) return

    const handleInteraction = () => {
      setHasInteracted(true)
    }

    const events = ['click', 'scroll', 'keydown', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction)
      })
    }
  }, [enableOnInteraction])

  // アイドル時間監視
  useEffect(() => {
    if (!enableOnIdle) return

    if ('requestIdleCallback' in window) {
      const idleCallback = window.requestIdleCallback(() => {
        setIsHydrated(true)
      })

      return () => window.cancelIdleCallback(idleCallback)
    } else {
      // フォールバック
      const timer = setTimeout(() => {
        setIsHydrated(true)
      }, delayMs)
      
      return () => clearTimeout(timer)
    }
  }, [enableOnIdle, delayMs])

  // 条件判定
  useEffect(() => {
    if (enableOnVisible && isVisible) {
      setIsHydrated(true)
    }
    if (enableOnInteraction && hasInteracted) {
      setIsHydrated(true)
    }
  }, [enableOnVisible, isVisible, enableOnInteraction, hasInteracted])

  return {
    isHydrated,
    isVisible,
    hasInteracted
  }
}