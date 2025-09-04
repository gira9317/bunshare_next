'use client'

import { useRef, useState } from 'react'
import { Bold, Italic, Underline, Quote, Undo, Redo } from 'lucide-react'
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
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // 簡易的なフォーマット機能（将来的にTiptapなどのリッチエディターに置き換え可能）
  const formatText = (format: string) => {
    if (!editorRef.current) return

    const textarea = editorRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    let formattedText = ''
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'underline':
        formattedText = `__${selectedText}__`
        break
      case 'quote':
        formattedText = `\n> ${selectedText}\n`
        break
      default:
        return
    }

    const newContent = 
      content.substring(0, start) + 
      formattedText + 
      content.substring(end)
    
    onChange(newContent)
    
    // カーソル位置を調整
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + formattedText.length,
        start + formattedText.length
      )
    }, 0)
  }

  return (
    <div className="space-y-4">
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
          onClick={() => formatText('quote')}
          className={cn(
            "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
            "transition-colors",
            "text-gray-700 dark:text-gray-300"
          )}
          title="引用"
        >
          <Quote className="w-4 h-4" />
        </button>
        
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {content.length.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>
      </div>

      {/* エディター本体 */}
      <textarea
        ref={editorRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "w-full min-h-[400px] px-4 py-3 rounded-lg border",
          "bg-white dark:bg-gray-900",
          "border-gray-300 dark:border-gray-600",
          "text-gray-900 dark:text-white",
          "placeholder-gray-500 dark:placeholder-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
          "transition-colors resize-none",
          "font-serif text-lg leading-relaxed"
        )}
        placeholder={placeholder}
        maxLength={maxLength}
      />

      {/* ヒント */}
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ヒント: テキストを選択してツールバーのボタンをクリックすると書式を適用できます
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Markdown記法に対応: **太字**, *斜体*, __下線__, &gt; 引用
          </p>
        </div>
      </div>
    </div>
  )
}