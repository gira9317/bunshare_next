'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Bookmark, Lock, Unlock, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  getBookmarkFoldersAction, 
  createBookmarkFolderAction, 
  saveBookmarkToFoldersAction,
  getWorkBookmarkFoldersAction,
  toggleFolderPrivateAction
} from '@/features/works/server/actions'

interface BookmarkFolder {
  id: string
  folder_key: string
  folder_name: string
  is_private: boolean
  is_system: boolean
  sort_order?: number
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
  const [initialSelectedFolders, setInitialSelectedFolders] = useState<string[]>([]) // 初期状態保存
  const [initialMemo, setInitialMemo] = useState('') // 初期メモ保存
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false) // データ読み込み状態

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      initializeData()
    } else {
      // モーダルが閉じられた時に状態をリセット
      setSelectedFolders([])
      setInitialSelectedFolders([])
      setMemo('')
      setInitialMemo('')
      setShowCreateForm(false)
      setNewFolderName('')
      setIsPrivate(false)
      setDataLoaded(false)
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

  // 同期的にすべてのデータを読み込み
  const initializeData = async () => {
    setDataLoaded(false)
    try {
      // 並行してフォルダリストと現在のブックマークを取得
      const [foldersResult, bookmarksResult] = await Promise.all([
        getBookmarkFoldersAction(),
        getWorkBookmarkFoldersAction(workId)
      ])

      if (foldersResult.success) {
        setFolders(foldersResult.folders)
      } else {
        console.error('フォルダ取得エラー:', foldersResult.error)
      }

      if (bookmarksResult.success) {
        // 初期状態と現在状態の両方を設定
        setSelectedFolders(bookmarksResult.folderKeys)
        setInitialSelectedFolders(bookmarksResult.folderKeys)
        setMemo(bookmarksResult.memo || '')
        setInitialMemo(bookmarksResult.memo || '')
      } else {
        console.error('現在のブックマーク取得エラー:', bookmarksResult.error)
      }
    } catch (error) {
      console.error('データ初期化エラー:', error)
    } finally {
      setDataLoaded(true)
    }
  }

  // 変更があったかどうかを検知
  const hasChanges = () => {
    if (!dataLoaded) return false
    
    // フォルダ選択の変更をチェック
    const foldersChanged = JSON.stringify([...selectedFolders].sort()) !== JSON.stringify([...initialSelectedFolders].sort())
    
    // メモの変更をチェック
    const memoChanged = memo.trim() !== initialMemo.trim()
    
    return foldersChanged || memoChanged
  }

  const handleFolderToggle = (folderKey: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderKey)
        ? prev.filter(key => key !== folderKey)
        : [...prev, folderKey]
    )
  }

  const handlePrivateToggle = async (folder: BookmarkFolder, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // システムフォルダは変更不可
    if (folder.is_system) {
      return
    }

    try {
      const newPrivateState = !folder.is_private
      const result = await toggleFolderPrivateAction(folder.id, newPrivateState)
      
      if (result.success) {
        // フォルダリストを更新
        setFolders(prev => 
          prev.map(f => 
            f.id === folder.id 
              ? { ...f, is_private: newPrivateState }
              : f
          )
        )
      } else {
        console.error('プライベート設定変更エラー:', result.error)
      }
    } catch (error) {
      console.error('プライベート設定変更エラー:', error)
    }
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
          'relative bg-white rounded-xl shadow-2xl',
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
          <h2 className="text-xl font-bold text-gray-900">
            保存先を選択
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Work Info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 line-clamp-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600">
            by {author}
          </p>
        </div>

        {/* Folders List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
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

          {!dataLoaded ? (
            // ローディング表示
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500 mr-2"></div>
              読み込み中...
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {/* システムフォルダ */}
              {folders.filter(folder => folder.is_system).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2 px-1">
                    システムフォルダ
                  </h4>
                  <div className="space-y-1">
                    {folders.filter(folder => folder.is_system).map((folder) => {
                      const isSelected = selectedFolders.includes(folder.folder_key)
                      return (
                        <div
                          key={folder.folder_key}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
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
                          <span className="flex-1 text-sm text-gray-700">
                            {folder.folder_name}
                          </span>
                          <button
                            onClick={(e) => handlePrivateToggle(folder, e)}
                            className={cn(
                              "p-1 rounded hover:bg-gray-600 transition-colors",
                              folder.is_system ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                            )}
                            title={folder.is_system ? "システムフォルダは設定を変更できません" : (folder.is_private ? "プライベート設定を解除" : "プライベート設定にする")}
                          >
                            {folder.is_private ? (
                              <Lock size={14} className="text-red-500" />
                            ) : (
                              <Unlock size={14} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* カスタムフォルダ */}
              {folders.filter(folder => !folder.is_system).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2 px-1">
                    カスタムフォルダ
                  </h4>
                  <div className="space-y-1">
                    {folders.filter(folder => !folder.is_system).map((folder) => {
                      const isSelected = selectedFolders.includes(folder.folder_key)
                      return (
                        <div
                          key={folder.folder_key}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
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
                          <span className="flex-1 text-sm text-gray-700">
                            {folder.folder_name}
                          </span>
                          <button
                            onClick={(e) => handlePrivateToggle(folder, e)}
                            className="p-1 rounded hover:bg-gray-600 transition-colors cursor-pointer"
                            title={folder.is_private ? "プライベート設定を解除" : "プライベート設定にする"}
                          >
                            {folder.is_private ? (
                              <Lock size={14} className="text-red-500" />
                            ) : (
                              <Unlock size={14} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* フォルダが存在しない場合 */}
              {folders.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Folder size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">フォルダがありません</p>
                  <p className="text-xs mt-1">「新規作成」でフォルダを作成してください</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create New Folder Form */}
        {showCreateForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="フォルダ名を入力"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  プライベートフォルダにする
                </span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 hovertext-gray-200"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メモ（任意）
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="ブックマークにメモを追加..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {memo.length}/500
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges() || loading || !dataLoaded}
            className={cn(
              'flex-1 px-4 py-3 font-medium rounded-lg transition-colors',
              hasChanges() && dataLoaded
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {loading ? '保存中...' : !dataLoaded ? '読み込み中...' : '保存'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}