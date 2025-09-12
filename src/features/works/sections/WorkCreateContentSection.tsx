'use client'

import { useState } from 'react'
import { RichTextEditor } from '../leaf/RichTextEditor'
import { ProofreadingPanel } from '../leaf/ProofreadingPanel'

export function WorkCreateContentSection() {
  const [content, setContent] = useState<string>('')
  
  // 校正パネルの状態管理
  const [proofreading, setProofreading] = useState<{
    isOpen: boolean
    selectedText: string
    selectedRange: Range | null
  }>({
    isOpen: false,
    selectedText: '',
    selectedRange: null
  })

  // 校正パネルを開く
  const handleOpenProofreadingPanel = (selectedText: string) => {
    // 現在の選択状態を保存
    const selection = window.getSelection()
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null
    
    setProofreading({
      isOpen: true,
      selectedText,
      selectedRange: range
    })
  }

  // 校正パネルを閉じる
  const handleCloseProofreadingPanel = () => {
    setProofreading({
      isOpen: false,
      selectedText: '',
      selectedRange: null
    })
  }

  // 校正結果を適用
  const handleApplyProofreadingChanges = (newText: string) => {
    if (!proofreading.selectedRange) return

    // 保存された選択範囲を復元
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(proofreading.selectedRange)
      
      // テキストを置換
      const range = proofreading.selectedRange
      range.deleteContents()
      const textNode = document.createTextNode(newText)
      range.insertNode(textNode)
      
      // 選択を新しいテキストの後に移動
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      
      // エディターの内容を更新するためにinputイベントを発火
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement
      if (editor) {
        const event = new Event('input', { bubbles: true })
        editor.dispatchEvent(event)
      }
    }

    handleCloseProofreadingPanel()
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
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
          onOpenProofreadingPanel={handleOpenProofreadingPanel}
        />
      </div>

      {/* 校正パネル */}
      <ProofreadingPanel
        isOpen={proofreading.isOpen}
        onClose={handleCloseProofreadingPanel}
        selectedText={proofreading.selectedText}
        onApplyChanges={handleApplyProofreadingChanges}
      />
    </>
  )
}