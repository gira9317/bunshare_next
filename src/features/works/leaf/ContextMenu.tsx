'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface ContextMenuOption {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  options: ContextMenuOption[]
  onClose: () => void
  selectedText?: string
}

export function ContextMenu({ 
  isOpen, 
  position, 
  options, 
  onClose,
  selectedText 
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // 画面外に出ないよう位置を調整
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      }

      let adjustedX = position.x
      let adjustedY = position.y

      // 右端からはみ出る場合
      if (position.x + rect.width > viewport.width) {
        adjustedX = viewport.width - rect.width - 8
      }

      // 下端からはみ出る場合
      if (position.y + rect.height > viewport.height) {
        adjustedY = viewport.height - rect.height - 8
      }

      // 左端・上端からはみ出る場合
      if (adjustedX < 8) adjustedX = 8
      if (adjustedY < 8) adjustedY = 8

      menu.style.left = `${adjustedX}px`
      menu.style.top = `${adjustedY}px`
    }
  }, [isOpen, position])

  if (!isOpen) return null

  return (
    <>
      {/* バックドロップ */}
      <div className="fixed inset-0 z-[100]" />
      
      {/* メニュー */}
      <div
        ref={menuRef}
        className={cn(
          "fixed z-[101] min-w-[200px]",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "rounded-lg shadow-lg",
          "py-2"
        )}
        style={{
          left: position.x,
          top: position.y
        }}
      >
        {selectedText && (
          <>
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                選択されたテキスト
              </p>
              <p className="text-sm text-gray-900 dark:text-white truncate max-w-[180px]">
                "{selectedText}"
              </p>
            </div>
          </>
        )}
        
        {options.map((option, index) => (
          <div key={index}>
            {option.separator && (
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            )}
            
            <button
              onClick={() => {
                if (!option.disabled) {
                  option.onClick()
                  onClose()
                }
              }}
              disabled={option.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left",
                "text-sm text-gray-700 dark:text-gray-300",
                "transition-colors",
                option.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              )}
            >
              {option.icon && (
                <span className="flex-shrink-0 w-4 h-4">
                  {option.icon}
                </span>
              )}
              <span className="flex-1">{option.label}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  )
}