'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateReadingProgressAction } from '@/features/works/server/actions'

interface UseReadingProgressOptions {
  workId: string
  userId?: string
  enabled?: boolean
  autoSaveInterval?: number
  scrollThreshold?: number
}

export function useReadingProgress({
  workId,
  userId,
  enabled = true,
  autoSaveInterval = 10000, // 10秒に短縮
  scrollThreshold = 2 // 2%以上の変化で保存（より敏感に）
}: UseReadingProgressOptions) {
  const lastProgressRef = useRef<number>(0)
  const lastScrollPositionRef = useRef<number>(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()
  const isUnloadingRef = useRef(false)
  const isInitializedRef = useRef(false)
  const router = useRouter()

  // 進捗を計算（ページ全体スクロール基準、92%で100%読了とみなす）
  const calculateProgress = useCallback((): { progress: number; position: number } => {
    const COMPLETION_THRESHOLD = 92 // 92%で100%読了とみなす
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const docHeight = document.documentElement.scrollHeight
    const winHeight = window.innerHeight
    const scrollableHeight = Math.max(docHeight - winHeight, 1)
    
    // 基本的な進捗計算
    const rawProgress = (scrollTop / scrollableHeight) * 100
    
    // 92%で100%とみなす調整
    const adjustedProgress = Math.min(rawProgress, COMPLETION_THRESHOLD)
    const finalProgress = (adjustedProgress / COMPLETION_THRESHOLD) * 100
    
    const result = {
      progress: Math.round(finalProgress * 100) / 100,
      position: Math.round(scrollTop)
    }
    
    // デバッグ: 計算時の値を表示
    if (scrollTop > 0) {
      console.log(`📐 Calculate progress: ${result.progress.toFixed(1)}% at ${result.position}px (raw scroll: ${scrollTop}) [workId: ${workId}]`, {
        docHeight,
        winHeight,
        scrollableHeight,
        rawProgress: rawProgress.toFixed(2),
        adjustedProgress: adjustedProgress.toFixed(2),
        currentUrl: window.location.pathname
      })
    }
    
    return result
  }, [])

  // サーバーに進捗を保存
  const saveProgress = useCallback(async (progress: number, position: number, force = false) => {
    if (!enabled || !userId) {
      return
    }

    // 現在のURLが作品ページでない場合はスキップ
    const currentPath = window.location.pathname
    if (!currentPath.includes('/works/')) {
      console.log('📍 Save skipped: not on work page', { currentPath, workId })
      return
    }

    // 初期化完了前は強制保存以外をスキップ
    if (!force && !isInitializedRef.current) {
      return
    }

    // 変化が小さい場合はスキップ（強制保存以外）
    const progressDiff = Math.abs(progress - lastProgressRef.current)
    if (!force && progressDiff < scrollThreshold) {
      return
    }


    try {
      const result = await updateReadingProgressAction(workId, progress, position)
      if (result.success) {
        lastProgressRef.current = progress
        lastScrollPositionRef.current = position
        console.log(`✅ Progress saved: ${progress.toFixed(1)}% at position ${position}px`)
      } else {
        console.error('❌ Progress save error:', result.error)
      }
    } catch (error) {
      console.error('❌ Progress save exception:', error)
    }
  }, [enabled, userId, workId, scrollThreshold])

  // デバウンス付きの進捗保存
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const { progress, position } = calculateProgress()
      saveProgress(progress, position)
    }, 1500) // 1.5秒後に保存（短縮）
  }, [calculateProgress, saveProgress])

  // スクロールイベントハンドラー
  const handleScroll = useCallback(() => {
    if (!enabled || isUnloadingRef.current) return
    debouncedSave()
  }, [enabled, debouncedSave])

  // ページ離脱前の保存
  const handleBeforeUnload = useCallback(async () => {
    isUnloadingRef.current = true
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    const { progress, position } = calculateProgress()
    // 同期的に保存を試行
    await saveProgress(progress, position, true)
  }, [calculateProgress, saveProgress])

  // 定期保存
  const startPeriodicSave = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      if (!isUnloadingRef.current) {
        const { progress, position } = calculateProgress()
        saveProgress(progress, position)
      }
    }, autoSaveInterval)
  }, [calculateProgress, saveProgress, autoSaveInterval])

  // 手動保存（しおり機能等で使用）
  const manualSave = useCallback(async () => {
    const { progress, position } = calculateProgress()
    await saveProgress(progress, position, true)
    return { progress, position }
  }, [calculateProgress, saveProgress])

  // 特定位置にスクロール
  const scrollToPosition = useCallback((position: number) => {
    window.scrollTo({
      top: position,
      behavior: 'smooth'
    })
  }, [])

  // 進捗に基づいてスクロール（パーセンテージ指定）
  const scrollToProgress = useCallback((progressPercent: number) => {
    const docHeight = document.documentElement.scrollHeight
    const winHeight = window.innerHeight
    const scrollableHeight = Math.max(docHeight - winHeight, 1)
    const targetPosition = (progressPercent / 100) * scrollableHeight
    
    scrollToPosition(Math.round(targetPosition))
  }, [scrollToPosition])

  // 現在の進捗を取得
  const getCurrentProgress = useCallback(() => {
    return calculateProgress()
  }, [calculateProgress])

  useEffect(() => {
    if (!enabled) return

    // 1秒後に初期化完了とみなす（より早く保存開始）
    const initTimer = setTimeout(() => {
      isInitializedRef.current = true
    }, 1000)

    // イベントリスナー設定
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // 定期保存開始
    startPeriodicSave()

    // ページ離脱時の処理（Next.js router）
    const handleRouteChange = () => {
      handleBeforeUnload()
    }

    router.events?.on('routeChangeStart', handleRouteChange)

    return () => {
      clearTimeout(initTimer)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      router.events?.off('routeChangeStart', handleRouteChange)
      
      // 最後に現在の進捗を保存
      const { progress, position } = calculateProgress()
      saveProgress(progress, position, true)
    }
  }, [enabled, handleScroll, handleBeforeUnload, startPeriodicSave, router, calculateProgress, saveProgress])

  return {
    manualSave,
    scrollToPosition,
    scrollToProgress,
    getCurrentProgress
  }
}