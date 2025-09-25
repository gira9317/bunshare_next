'use client'

import { useRef, useState, useEffect } from 'react'
import { Bold, Italic, Underline, Quote, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContextMenu, type ContextMenuOption } from './ContextMenu'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  maxLength?: number
  onOpenProofreadingPanel?: (selectedText: string) => void
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = '本文を入力...',
  maxLength = 50000,
  onOpenProofreadingPanel
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [textLength, setTextLength] = useState(0)
  
  // コンテキストメニュー関連の状態
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    selectedText: string
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    selectedText: ''
  })
  
  // 長押しタイマー（モバイル用）
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // contentEditableの内容が変更されたときに隠しinputとstateを更新
  const handleInput = () => {
    if (!editorRef.current) return
    
    const htmlContent = editorRef.current.innerHTML
    const textContent = editorRef.current.textContent || editorRef.current.innerText || ''
    
    // 文字数制限チェック
    if (textContent.length > maxLength) {
      return
    }
    
    setTextLength(textContent.length)
    
    // 隠しinputを更新（フォーム送信用）
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = htmlContent
    }
    
    onChange(htmlContent)
  }

  // プレースホルダー表示の管理
  const handleFocus = () => {
    setIsFocused(true)
    if (editorRef.current && editorRef.current.textContent === '') {
      editorRef.current.innerHTML = ''
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (editorRef.current && editorRef.current.textContent === '') {
      editorRef.current.innerHTML = `<div class="placeholder">${placeholder}</div>`
    }
  }

  // コンテンツが外部から変更された時にエディタを更新
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      if (content) {
        editorRef.current.innerHTML = content
        setTextLength((editorRef.current.textContent || '').length)
      } else {
        editorRef.current.innerHTML = `<div class="placeholder">${placeholder}</div>`
        setTextLength(0)
      }
    }
  }, [content, placeholder])

  // 初期化
  useEffect(() => {
    if (editorRef.current && !content) {
      editorRef.current.innerHTML = `<div class="placeholder">${placeholder}</div>`
    }
  }, [placeholder])

  // フォーマットボタンの処理
  const formatText = (command: string) => {
    if (!editorRef.current) return
    
    // プレースホルダーを削除
    const placeholderDiv = editorRef.current.querySelector('.placeholder')
    if (placeholderDiv) {
      placeholderDiv.remove()
    }
    
    document.execCommand(command, false, undefined)
    editorRef.current.focus()
    handleInput() // 変更を反映
  }

  // Enterキー処理（改行をdivではなくbrにする）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      document.execCommand('insertHTML', false, '<br><br>')
    }
  }

  // 選択されたテキストを取得
  const getSelectedText = (): string => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return ''
    
    const range = selection.getRangeAt(0)
    const selectedText = range.toString().trim()
    
    // エディター内のテキストかどうかをチェック
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      return selectedText
    }
    
    return ''
  }

  // 選択されたテキストを置換
  const replaceSelectedText = (newText: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return
    
    // テキストを置換
    range.deleteContents()
    const textNode = document.createTextNode(newText)
    range.insertNode(textNode)
    
    // 選択を新しいテキストの後に移動
    range.setStartAfter(textNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    
    // エディターの内容を更新
    handleInput()
  }

  // 右クリックイベントハンドラー
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    
    const selectedText = getSelectedText()
    if (!selectedText) return
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      selectedText
    })
  }

  // タッチ開始（長押し検出用）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
    }
    
    touchTimerRef.current = setTimeout(() => {
      const selectedText = getSelectedText()
      if (!selectedText) return
      
      const touch = e.touches[0]
      if (touch) {
        setContextMenu({
          isOpen: true,
          position: { x: touch.clientX, y: touch.clientY },
          selectedText
        })
      }
    }, 800) // 800ms の長押しで発動
  }

  // タッチ終了・移動（長押しキャンセル）
  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
  }

  // コンテキストメニューを閉じる
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }

  // 校正パネルを開く
  const handleOpenProofreading = () => {
    if (onOpenProofreadingPanel && contextMenu.selectedText) {
      onOpenProofreadingPanel(contextMenu.selectedText)
    }
  }

  // コンテキストメニューオプション
  const contextMenuOptions: ContextMenuOption[] = [
    {
      label: 'コピー',
      onClick: () => navigator.clipboard.writeText(contextMenu.selectedText),
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    },
    {
      label: '校正',
      onClick: handleOpenProofreading,
      disabled: !onOpenProofreadingPanel,
      separator: true,
      icon: <Edit3 className="w-4 h-4" />
    }
  ]

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* 隠しinput（フォーム送信用） */}
      <textarea
        ref={hiddenInputRef}
        name="content"
        value={content}
        onChange={() => {}} // 読み取り専用
        style={{ display: 'none' }}
        required
      />

      {/* ツールバー */}
      <div className={cn(
        "flex items-center gap-1 p-2 rounded-lg border",
        "bg-gray-50",
        "border-gray-300",
        isFocused && "border-purple-500 ring-2 ring-purple-500/20"
      )}>
        <button
          type="button"
          onClick={() => formatText('bold')}
          className={cn(
            "p-2 rounded hover:bg-gray-50",
            "transition-colors",
            "text-gray-700"
          )}
          title="太字"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('italic')}
          className={cn(
            "p-2 rounded hover:bg-gray-50",
            "transition-colors",
            "text-gray-700"
          )}
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('underline')}
          className={cn(
            "p-2 rounded hover:bg-gray-50",
            "transition-colors",
            "text-gray-700"
          )}
          title="下線"
        >
          <Underline className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <button
          type="button"
          onClick={() => formatText('insertUnorderedList')}
          className={cn(
            "p-2 rounded hover:bg-gray-50",
            "transition-colors",
            "text-gray-700"
          )}
          title="箇条書き"
        >
          •
        </button>
        
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span>
            {textLength.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>
      </div>

      {/* エディター本体 */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        className={cn(
          "w-full min-h-[400px] px-4 py-3 rounded-lg border",
          "bg-white",
          "border-gray-300",
          "text-gray-900",
          "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
          "transition-colors",
          "font-serif text-lg leading-relaxed",
          "prose prose-sm max-w-none",
          "[&_.placeholder]:text-gray-500 [&_.placeholder]text-gray-400",
          "[&_.placeholder]:pointer-events-none [&_.placeholder]:select-none"
        )}
        style={{ 
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}
        suppressContentEditableWarning={true}
      />

      {/* ヒント */}
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-gray-500">
            ヒント: テキストを選択して右クリック（スマホは長押し）すると校正機能が使えます
          </p>
          <p className="text-xs text-gray-500">
            リッチテキスト形式で保存されます
          </p>
        </div>
      </div>

      {/* コンテキストメニュー */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        options={contextMenuOptions}
        onClose={closeContextMenu}
        selectedText={contextMenu.selectedText}
      />
    </div>
  )
}