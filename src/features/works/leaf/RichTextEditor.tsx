'use client'

import { useRef, useState, useEffect } from 'react'
import { Bold, Italic, Underline, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  maxLength?: number
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = '本文を入力...',
  maxLength = 50000 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [textLength, setTextLength] = useState(0)

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
        "bg-gray-50 dark:bg-gray-900",
        "border-gray-300 dark:border-gray-600",
        isFocused && "border-purple-500 ring-2 ring-purple-500/20"
      )}>
        <button
          type="button"
          onClick={() => formatText('bold')}
          className={cn(
            "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
            "transition-colors",
            "text-gray-700 dark:text-gray-300"
          )}
          title="太字"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('italic')}
          className={cn(
            "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
            "transition-colors",
            "text-gray-700 dark:text-gray-300"
          )}
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('underline')}
          className={cn(
            "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
            "transition-colors",
            "text-gray-700 dark:text-gray-300"
          )}
          title="下線"
        >
          <Underline className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button
          type="button"
          onClick={() => formatText('insertUnorderedList')}
          className={cn(
            "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
            "transition-colors",
            "text-gray-700 dark:text-gray-300"
          )}
          title="箇条書き"
        >
          •
        </button>
        
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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
        className={cn(
          "w-full min-h-[400px] px-4 py-3 rounded-lg border",
          "bg-white dark:bg-gray-900",
          "border-gray-300 dark:border-gray-600",
          "text-gray-900 dark:text-white",
          "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
          "transition-colors",
          "font-serif text-lg leading-relaxed",
          "prose prose-sm max-w-none",
          "[&_.placeholder]:text-gray-500 [&_.placeholder]:dark:text-gray-400",
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ヒント: テキストを選択してツールバーのボタンをクリックすると書式を適用できます
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            リッチテキスト形式で保存されます
          </p>
        </div>
      </div>
    </div>
  )
}