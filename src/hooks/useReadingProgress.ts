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
  contentSelector?: string // 本文コンテンツのセレクター
}

export function useReadingProgress({
  workId,
  userId,
  enabled = true,
  autoSaveInterval = 30000, // 30秒
  scrollThreshold = 5, // 5%以上の変化で保存
  contentSelector = '#main-content-text' // デフォルトの本文セレクター
}: UseReadingProgressOptions) {
  const lastProgressRef = useRef<number>(0)
  const lastScrollPositionRef = useRef<number>(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()
  const isUnloadingRef = useRef(false)
  const router = useRouter()

  // 進捗を計算（本文コンテンツのみ）
  const calculateProgress = useCallback((): { progress: number; position: number } => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    
    // 複数のセレクターを順番に試す
    const fallbackSelectors = [
      contentSelector,
      '#main-content-text',
      '.work-content',
      '.work-content-container .work-content',
      '.prose'
    ]
    
    let contentElement: Element | null = null
    let usedSelector = ''
    
    for (const selector of fallbackSelectors) {
      contentElement = document.querySelector(selector)
      if (contentElement) {
        usedSelector = selector
        break
      }
    }
    
    console.log('🔍 Reading Progress Debug:')
    console.log(`  Primary selector: ${contentSelector}`)
    console.log(`  Used selector: ${usedSelector || 'NONE'}`)
    console.log(`  Element found: ${!!contentElement}`)
    console.log(`  Current scroll: ${scrollTop}px`)
    
    if (!contentElement) {
      // フォールバック: コンテンツ要素が見つからない場合は従来の計算
      const docHeight = document.documentElement.scrollHeight
      const winHeight = window.innerHeight
      const scrollableHeight = Math.max(docHeight - winHeight, 1)
      const progress = Math.min((scrollTop / scrollableHeight) * 100, 100)
      
      console.log('⚠️  FALLBACK MODE (No content element):')
      console.log(`  Document height: ${docHeight}px`)
      console.log(`  Window height: ${winHeight}px`)
      console.log(`  Scrollable height: ${scrollableHeight}px`)
      console.log(`  Progress: ${progress.toFixed(2)}%`)
      
      return {
        progress: Math.round(progress * 100) / 100,
        position: Math.round(scrollTop)
      }
    }
    
    // 本文コンテンツの位置情報を取得
    const contentRect = contentElement.getBoundingClientRect()
    const contentTop = scrollTop + contentRect.top
    const contentHeight = contentElement.scrollHeight || contentRect.height
    const winHeight = window.innerHeight
    
    console.log('📖 CONTENT MODE:')
    console.log(`  Content rect:`, contentRect)
    console.log(`  Content top: ${contentTop}px`)
    console.log(`  Content height: ${contentHeight}px`)
    console.log(`  Window height: ${winHeight}px`)
    
    // 本文エリア内でのスクロール進捗を計算
    let progress = 0
    let debugInfo = ''
    
    if (scrollTop < contentTop) {
      // まだ本文に到達していない
      progress = 0
      debugInfo = 'Before content area'
    } else if (scrollTop >= contentTop + contentHeight - winHeight) {
      // 本文を読み終わった
      progress = 100
      debugInfo = 'Content completed'
    } else {
      // 本文内でのスクロール進捗
      const contentScrollTop = scrollTop - contentTop
      const contentScrollableHeight = Math.max(contentHeight - winHeight, 1)
      progress = Math.min((contentScrollTop / contentScrollableHeight) * 100, 100)
      debugInfo = 'Reading content'
      
      console.log(`  Content scroll top: ${contentScrollTop}px`)
      console.log(`  Content scrollable height: ${contentScrollableHeight}px`)
    }
    
    console.log(`  Status: ${debugInfo}`)
    console.log(`  Progress: ${progress.toFixed(2)}%`)
    console.log('---')
    
    return {
      progress: Math.max(0, Math.round(progress * 100) / 100), // 0%未満にならないよう制限
      position: Math.round(scrollTop)
    }
  }, [contentSelector])

  // サーバーに進捗を保存
  const saveProgress = useCallback(async (progress: number, position: number, force = false) => {
    if (!enabled || !userId) {
      console.log('💾 Save skipped: not enabled or no userId')
      return
    }

    // 変化が小さい場合はスキップ（強制保存以外）
    const progressDiff = Math.abs(progress - lastProgressRef.current)
    if (!force && progressDiff < scrollThreshold) {
      console.log(`💾 Save skipped: progress change too small (${progressDiff.toFixed(2)}% < ${scrollThreshold}%)`)
      return
    }

    console.log('💾 Saving progress:')
    console.log(`  Work ID: ${workId}`)
    console.log(`  Progress: ${progress.toFixed(2)}% (was ${lastProgressRef.current.toFixed(2)}%)`)
    console.log(`  Position: ${position}px`)
    console.log(`  Force save: ${force}`)

    try {
      const result = await updateReadingProgressAction(workId, progress, position)
      if (result.success) {
        lastProgressRef.current = progress
        lastScrollPositionRef.current = position
        console.log('✅ Progress saved successfully')
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
    }, 3000) // 3秒後に保存
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