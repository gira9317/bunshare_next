'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Bookmark, Lock, Unlock, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  getBookmarkFoldersAction, 
  createBookmarkFolderAction, 
  saveBookmarkToFoldersAction,
  getWorkBookmarkFoldersAction 
} from '@/features/works/server/actions'

interface BookmarkFolder {
  id: string
  folder_key: string
  folder_name: string
  is_private: boolean
  is_system: boolean
}

interface BookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  workId: string
  title: string
  author: string
  currentBookmarkFolders?: string[]
}

export function BookmarkModal({ 
  isOpen, 
  onClose, 
  workId, 
  title, 
  author,
  currentBookmarkFolders = []
}: BookmarkModalProps) {
  const [mounted, setMounted] = useState(false)
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      loadFolders()
      loadCurrentBookmarks()
    } else {
      // モーダルが閉じられた時に状態をリセット
      setSelectedFolders([])
      setMemo('')
      setShowCreateForm(false)
      setNewFolderName('')
      setIsPrivate(false)
    }
    return () => setMounted(false)
  }, [isOpen, workId])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const loadFolders = async () => {
    try {
      const result = await getBookmarkFoldersAction()
      if (result.success) {
        let folderList = result.folders
        
        // フォルダが存在しない場合はデフォルトフォルダを作成
        if (folderList.length === 0) {
          const defaultResult = await createBookmarkFolderAction('デフォルト', false)
          if (defaultResult.success) {
            folderList = [defaultResult.folder]
          }
        }
        
        setFolders(folderList)
      } else {
        console.error('フォルダ取得エラー:', result.error)
      }
    } catch (error) {
      console.error('フォルダ取得エラー:', error)
    }
  }

  const loadCurrentBookmarks = async () => {
    try {
      const result = await getWorkBookmarkFoldersAction(workId)
      if (result.success) {
        setSelectedFolders(result.folderKeys)
        setMemo(result.memo || '')
      } else {
        console.error('現在のブックマーク取得エラー:', result.error)
      }
    } catch (error) {
      console.error('現在のブックマーク取得エラー:', error)
    }
  }

  const handleFolderToggle = (folderKey: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderKey)
        ? prev.filter(key => key !== folderKey)
        : [...prev, folderKey]
    )
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setLoading(true)
    try {
      const result = await createBookmarkFolderAction(newFolderName.trim(), isPrivate)
      if (result.success) {
        setFolders(prev => [...prev, result.folder])
        setNewFolderName('')
        setIsPrivate(false)
        setShowCreateForm(false)
      } else {
        alert(result.error || 'フォルダの作成に失敗しました')
      }
    } catch (error) {
      console.error('フォルダ作成エラー:', error)
      alert('フォルダの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await saveBookmarkToFoldersAction(workId, selectedFolders, memo.trim())
      if (result.success) {
        onClose()
      } else {
        alert(result.error || 'ブックマークの保存に失敗しました')
      }
    } catch (error) {
      console.error('ブックマーク保存エラー:', error)
      alert('ブックマークの保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
          'w-full max-w-md mx-4 p-6',
          'animate-in slide-in-from-bottom-4 duration-300'
        )}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            保存先を選択
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Work Info */}
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            by {author}
          </p>
        </div>

        {/* Folders List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              フォルダを選択
            </label>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-purple-500 hover:text-purple-600 text-sm font-medium flex items-center gap-1"
            >
              <Plus size={14} />
              新規作成
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {folders.map((folder) => {
              const isSelected = selectedFolders.includes(folder.folder_key)
              return (
                <div
                  key={folder.folder_key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    handleFolderToggle(folder.folder_key)
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // 制御された入力
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 pointer-events-none"
                  />
                  <Folder size={16} className="text-gray-500" />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {folder.folder_name}
                  </span>
                  {folder.is_private && (
                    <Lock size={14} className="text-gray-400" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Create New Folder Form */}
        {showCreateForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="space-y-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="フォルダ名を入力"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  プライベートフォルダにする
                </span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || loading}
                  className="flex-1 px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Memo Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            メモ（任意）
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="ブックマークにメモを追加..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {memo.length}/500
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={selectedFolders.length === 0 || loading}
            className={cn(
              'flex-1 px-4 py-3 font-medium rounded-lg transition-colors',
              selectedFolders.length > 0
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}