'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
}

export function TagInput({ tags, onChange, maxTags = 10 }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().replace(/^#/, '')
    
    if (!trimmedTag) return
    
    if (tags.length >= maxTags) {
      setError(`タグは最大${maxTags}個までです`)
      return
    }
    
    if (tags.includes(trimmedTag)) {
      setError('既に追加されているタグです')
      return
    }
    
    onChange([...tags, trimmedTag])
    setInputValue('')
    setError('')
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
    setError('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      // ハッシュタグで区切られた複数タグの処理
      if (inputValue.includes('#')) {
        const newTags = inputValue
          .split('#')
          .map(tag => tag.trim())
          .filter(tag => tag)
        
        newTags.forEach(tag => {
          if (tags.length < maxTags && !tags.includes(tag)) {
            onChange([...tags, tag])
          }
        })
        
        setInputValue('')
      } else {
        addTag(inputValue)
      }
    }
    
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className="space-y-3">
      <div className={cn(
        "flex flex-wrap gap-2 p-3 rounded-lg border",
        "bg-white dark:bg-gray-900",
        "border-gray-300 dark:border-gray-600",
        "focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20",
        "transition-all"
      )}>
        {/* 既存のタグ */}
        {tags.map((tag, index) => (
          <span
            key={index}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-1 rounded-full",
              "bg-purple-100 dark:bg-purple-900/30",
              "text-purple-700 dark:text-purple-300",
              "text-sm font-medium"
            )}
          >
            <Hash className="w-3 h-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        {/* 入力フィールド */}
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 min-w-[120px] px-2 py-1",
              "bg-transparent outline-none",
              "text-gray-900 dark:text-white",
              "placeholder-gray-500 dark:placeholder-gray-400"
            )}
            placeholder={tags.length === 0 ? "タグを入力してEnter" : ""}
          />
        )}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* 隠し入力フィールド（フォームデータ収集用） */}
      <input type="hidden" name="tags" value={tags.join(',')} />

      {/* ヒント */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>
          {tags.length}/{maxTags} 個のタグ
        </span>
        <span>
          #タグ1 #タグ2 のように複数同時に追加できます
        </span>
      </div>

      {/* 人気のタグ（サジェスト） */}
      {tags.length < maxTags && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            人気のタグ:
          </p>
          <div className="flex flex-wrap gap-2">
            {['ファンタジー', '恋愛', 'SF', 'ミステリー', '青春', 'ホラー'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                disabled={tags.includes(tag)}
                className={cn(
                  "px-2 py-1 rounded text-xs",
                  "border border-gray-300 dark:border-gray-600",
                  "hover:bg-gray-100 dark:hover:bg-gray-700",
                  "transition-colors",
                  tags.includes(tag) && "opacity-50 cursor-not-allowed"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}