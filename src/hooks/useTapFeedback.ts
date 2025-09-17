'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

interface TapFeedbackOptions {
  disabled?: boolean
  scaleAmount?: number
  duration?: number
}

export function useTapFeedback(options: TapFeedbackOptions = {}) {
  const {
    disabled = false,
    scaleAmount = 0.95,
    duration = 120
  } = options

  const [isPressed, setIsPressed] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const elementRef = useRef<HTMLElement>(null)

  // アクセシビリティ: モーション設定をチェック
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  const handleTouchStart = useCallback(() => {
    if (disabled || prefersReducedMotion) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsPressed(true)
  }, [disabled, prefersReducedMotion])

  const handleTouchEnd = useCallback(() => {
    if (disabled || prefersReducedMotion) return

    timeoutRef.current = setTimeout(() => {
      setIsPressed(false)
    }, duration)
  }, [disabled, prefersReducedMotion, duration])

  const handleMouseDown = useCallback((e: MouseEvent | React.MouseEvent) => {
    // モバイルのtouch eventsと重複を避ける
    if (e.type === 'mousedown' && 'ontouchstart' in window) return
    if (disabled || prefersReducedMotion) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsPressed(true)
  }, [disabled, prefersReducedMotion])

  const handleMouseUp = useCallback(() => {
    if (disabled || prefersReducedMotion) return
    
    timeoutRef.current = setTimeout(() => {
      setIsPressed(false)
    }, duration)
  }, [disabled, prefersReducedMotion, duration])

  const handleMouseLeave = useCallback(() => {
    if (disabled || prefersReducedMotion) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsPressed(false)
  }, [disabled, prefersReducedMotion])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // イベントハンドラーを返す
  const tapProps = {
    ref: elementRef,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    style: {
      transform: isPressed && !prefersReducedMotion ? `scale(${scaleAmount})` : 'scale(1)',
      filter: isPressed && !prefersReducedMotion ? 'brightness(0.9)' : 'brightness(1)',
      transition: `transform ${duration}ms ease-out, filter ${duration}ms ease-out`,
      willChange: 'transform, filter',
      transformOrigin: 'center'
    }
  }

  return {
    tapProps,
    isPressed
  }
}