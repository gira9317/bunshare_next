'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import { navigationLoader } from '@/lib/navigation'

// NProgress設定 - より高速表示
NProgress.configure({ 
  showSpinner: false,
  minimum: 0.05,
  easing: 'linear',
  speed: 100,
  trickleSpeed: 50,
})

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isInitialLoad = useRef(true)

  useEffect(() => {
    // グローバルクリックリスナーを追加
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // リンク要素またはリンクを含む要素をチェック
      const link = target.closest('a[href]') as HTMLAnchorElement
      if (!link) return
      
      const href = link.getAttribute('href')
      if (!href) return
      
      // 外部リンクや特殊なリンクは除外
      if (
        href.startsWith('http') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        href === pathname + (window.location.search || '')
      ) {
        return
      }
      
      // ローディングを即座に開始
      navigationLoader.start()
    }

    // ドキュメント全体にクリックリスナーを追加
    document.addEventListener('click', handleClick, { capture: true })
    
    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [pathname])

  useEffect(() => {
    // 初回ロードの場合はスキップ
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    // ページ遷移完了時にローディングを終了
    const timer = setTimeout(() => {
      navigationLoader.done()
    }, 30)

    return () => {
      clearTimeout(timer)
    }
  }, [pathname, searchParams])

  return null
}