'use client'

import { useState } from 'react'
import { RichTextEditor } from '../leaf/RichTextEditor'

export function WorkCreateContentSection() {
  const [content, setContent] = useState<string>('')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <span className="text-2xl">✍️</span>
          本文
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          作品の内容を入力してください
        </p>
      </div>

      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder="あなたの物語をここに..."
      />
    </div>
  )
}