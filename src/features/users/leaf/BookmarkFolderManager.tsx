'use client'

import { useState, useEffect } from 'react'
import { Plus, Folder, Lock, Unlock, Edit2, Trash2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  getBookmarkFoldersAction, 
  createBookmarkFolderAction, 
  toggleFolderPrivateAction,
  updateBookmarkFolderAction,
  deleteBookmarkFolderAction
} from '@/features/works/server/actions'

interface BookmarkFolder {
  id: string
  folder_key: string
  folder_name: string
  is_private: boolean
  is_system: boolean
  sort_order?: number
  color?: string
  icon?: string
}

interface BookmarkFolderManagerProps {
  userId: string
  onFolderSelect?: (folderKey: string) => void
  selectedFolder?: string
}

export function BookmarkFolderManager({ 
  userId, 
  onFolderSelect, 
  selectedFolder 
}: BookmarkFolderManagerProps) {
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderPrivate, setNewFolderPrivate] = useState(false)
  const [editFolderName, setEditFolderName] = useState('')

  useEffect(() => {
    loadFolders()
  }, [])

  const loadFolders = async () => {
    setLoading(true)
    try {
      const result = await getBookmarkFoldersAction()
      if (result.success) {
        setFolders(result.folders.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      }
    } catch (error) {
      console.error('フォルダ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const result = await createBookmarkFolderAction(newFolderName.trim(), newFolderPrivate)
      if (result.success) {
        await loadFolders() // フォルダリストを再読み込み
        setNewFolderName('')
        setNewFolderPrivate(false)
        setShowCreateForm(false)
      } else {
        alert(result.error || 'フォルダの作成に失敗しました')
      }
    } catch (error) {
      console.error('フォルダ作成エラー:', error)
      alert('フォルダの作成に失敗しました')
    }
  }

  const handlePrivateToggle = async (folder: BookmarkFolder) => {
    if (folder.is_system) return

    try {
      const result = await toggleFolderPrivateAction(folder.id, !folder.is_private)
      if (result.success) {
        setFolders(prev => 
          prev.map(f => 
            f.id === folder.id 
              ? { ...f, is_private: !f.is_private }
              : f
          )
        )
      }
    } catch (error) {
      console.error('プライベート設定変更エラー:', error)
    }
  }

  const handleStartEdit = (folder: BookmarkFolder) => {
    if (folder.is_system) return
    setEditingFolder(folder.id)
    setEditFolderName(folder.folder_name)
  }

  const handleSaveEdit = async (folderId: string) => {
    if (!editFolderName.trim()) return

    try {
      const result = await updateBookmarkFolderAction(folderId, editFolderName.trim())
      if (result.success) {
        await loadFolders() // フォルダリストを再読み込み
        setEditingFolder(null)
        setEditFolderName('')
      } else {
        alert(result.error || 'フォルダ名の更新に失敗しました')
      }
    } catch (error) {
      console.error('フォルダ名更新エラー:', error)
      alert('フォルダ名の更新に失敗しました')
    }
  }

  const handleDeleteFolder = async (folder: BookmarkFolder) => {
    if (folder.is_system) return
    
    if (!confirm(`「${folder.folder_name}」フォルダを削除しますか？\nフォルダ内のブックマークも削除されます。`)) {
      return
    }

    try {
      const result = await deleteBookmarkFolderAction(folder.id)
      if (result.success) {
        await loadFolders() // フォルダリストを再読み込み
      } else {
        alert(result.error || 'フォルダの削除に失敗しました')
      }
    } catch (error) {
      console.error('フォルダ削除エラー:', error)
      alert('フォルダの削除に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mr-2"></div>
        フォルダを読み込み中...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          📁 ブックマークフォルダ管理
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
        >
          <Plus size={16} />
          新規作成
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
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
              checked={newFolderPrivate}
              onChange={(e) => setNewFolderPrivate(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              プライベートフォルダにする
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="flex-1 px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              作成
            </button>
          </div>
        </div>
      )}

      {/* Folders List */}
      <div className="space-y-3">
        {folders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Folder size={32} className="mx-auto mb-3 text-gray-400" />
            <p>フォルダがありません</p>
            <p className="text-sm mt-1">「新規作成」でフォルダを作成してください</p>
          </div>
        ) : (
          <>
            {/* System Folders */}
            {folders.filter(f => f.is_system).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 px-2">
                  システムフォルダ
                </h4>
                <div className="space-y-2">
                  {folders.filter(f => f.is_system).map(folder => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      isSelected={selectedFolder === folder.folder_key}
                      isEditing={editingFolder === folder.id}
                      editName={editFolderName}
                      onSelect={onFolderSelect}
                      onPrivateToggle={handlePrivateToggle}
                      onStartEdit={handleStartEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={() => setEditingFolder(null)}
                      onDelete={handleDeleteFolder}
                      onEditNameChange={setEditFolderName}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom Folders */}
            {folders.filter(f => !f.is_system).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 px-2">
                  カスタムフォルダ
                </h4>
                <div className="space-y-2">
                  {folders.filter(f => !f.is_system).map(folder => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      isSelected={selectedFolder === folder.folder_key}
                      isEditing={editingFolder === folder.id}
                      editName={editFolderName}
                      onSelect={onFolderSelect}
                      onPrivateToggle={handlePrivateToggle}
                      onStartEdit={handleStartEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={() => setEditingFolder(null)}
                      onDelete={handleDeleteFolder}
                      onEditNameChange={setEditFolderName}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface FolderItemProps {
  folder: BookmarkFolder
  isSelected: boolean
  isEditing: boolean
  editName: string
  onSelect?: (folderKey: string) => void
  onPrivateToggle: (folder: BookmarkFolder) => void
  onStartEdit: (folder: BookmarkFolder) => void
  onSaveEdit: (folderId: string) => void
  onCancelEdit: () => void
  onDelete: (folder: BookmarkFolder) => void
  onEditNameChange: (name: string) => void
}

function FolderItem({
  folder,
  isSelected,
  isEditing,
  editName,
  onSelect,
  onPrivateToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditNameChange
}: FolderItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isSelected 
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
        onSelect && 'cursor-pointer'
      )}
      onClick={() => onSelect?.(folder.folder_key)}
    >
      <Folder size={18} className="text-gray-500 flex-shrink-0" />
      
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSaveEdit(folder.id)
            } else if (e.key === 'Escape') {
              onCancelEdit()
            }
          }}
        />
      ) : (
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
          {folder.folder_name}
        </span>
      )}

      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Private Toggle */}
        <button
          onClick={() => onPrivateToggle(folder)}
          disabled={folder.is_system}
          className={cn(
            "p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors",
            folder.is_system ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
          title={
            folder.is_system 
              ? "システムフォルダは設定を変更できません" 
              : folder.is_private 
                ? "プライベート設定を解除" 
                : "プライベート設定にする"
          }
        >
          {folder.is_private ? (
            <Lock size={14} className="text-red-500" />
          ) : (
            <Unlock size={14} className="text-gray-400" />
          )}
        </button>

        {/* Edit Button */}
        {!folder.is_system && !isEditing && (
          <button
            onClick={() => onStartEdit(folder)}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="フォルダ名を編集"
          >
            <Edit2 size={14} className="text-blue-500" />
          </button>
        )}

        {/* Save/Cancel for editing */}
        {isEditing && (
          <>
            <button
              onClick={() => onSaveEdit(folder.id)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-green-500"
              title="保存"
            >
              ✓
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-red-500"
              title="キャンセル"
            >
              ✕
            </button>
          </>
        )}

        {/* Delete Button */}
        {!folder.is_system && !isEditing && (
          <button
            onClick={() => onDelete(folder)}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="フォルダを削除"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        )}
      </div>
    </div>
  )
}