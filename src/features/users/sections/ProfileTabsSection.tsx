'use client'

import { useState, useEffect, ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import {
  CSS,
} from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { UserWithStats } from '../schemas'
import { WorkCard } from '@/components/domain/WorkCard'
import type { Work } from '@/features/works/types'
import { BookmarkFolderManager } from '../leaf/BookmarkFolderManager'
import { getBookmarkFoldersAction, getBookmarksByFolderAction, updateBookmarkOrderAction, removeBookmarkFromFolderAction, moveBookmarkToFolderAction } from '@/features/works/server/actions'
import { Folder, ArrowLeft, Settings, Lock, MoreVertical, ChevronLeft, Bookmark, Edit3, Trash2, Move, GripVertical, FileText, PenTool, Heart, Clock, Sparkles, Library, Cog, BookOpen, Calendar, Shield, Wrench, Mail, Key, ChevronRight } from 'lucide-react'
import { PrivacySettingsCard } from '../leaf/PrivacySettingsCard'
import { NotificationSettingsCard } from '../leaf/NotificationSettingsCard'
import { AccountSettingsCard } from '../leaf/AccountSettingsCard'

interface Tab {
  id: string
  label: string
  icon: ReactNode
  content: ReactNode
}

interface ProfileTabsSectionProps {
  user: UserWithStats
  currentUserId?: string | null
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

export function ProfileTabsSection({ 
  user,
  currentUserId,
  tabs,
  defaultTab,
  className 
}: ProfileTabsSectionProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation - Mobile first */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                'whitespace-nowrap flex-shrink-0', // Prevent text wrapping
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.label === '投稿作品一覧' ? '作品' : 
                 tab.label === '作品管理' ? '管理' :
                 tab.label === 'ライブラリ' ? 'ライブラリ' : '設定'}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTabContent}
      </div>
    </div>
  )
}

// Draggable WorkCard Wrapper
function DraggableWorkCard({ work, isManagementMode, onRemove, onMove, availableFolders }: {
  work: Work
  isManagementMode: boolean
  onRemove: (workId: string) => void
  onMove: (workId: string, targetFolder: string) => void
  availableFolders: Array<{ folder_key: string; folder_name: string }>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: work.work_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative transition-transform duration-200',
        isManagementMode && 'ring-2 ring-blue-200 dark:ring-blue-800 rounded-lg bg-blue-50/30 dark:bg-blue-950/30',
        isDragging && 'z-50 opacity-75 scale-105 rotate-2 shadow-2xl ring-4 ring-blue-300 dark:ring-blue-600'
      )}
    >
      {/* Management Mode Overlay - ボタンを個別に配置 */}
      {isManagementMode && (
        <>
          {/* Drag Handle */}
          <div 
            className="absolute top-2 left-2 z-20 flex items-center justify-center w-10 h-10 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 cursor-grab active:cursor-grabbing hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            {...attributes} 
            {...listeners}
          >
            <GripVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove(work.work_id)
            }}
            className="absolute top-2 right-2 z-20 flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-xl shadow-lg cursor-pointer hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </>
      )}
      
      <WorkCard
        work={work}
        isBookmarked={true}
        isManagementMode={isManagementMode}
        onRemove={onRemove}
        onMove={onMove}
        availableFolders={availableFolders}
        disableNavigation={isManagementMode}
      />
    </div>
  )
}

// Tab content components
export function DashboardTabContent({ user, publishedWorks }: { user: UserWithStats; publishedWorks: Work[] }) {
  return (
    <div className="space-y-4">
      {publishedWorks.length > 0 ? (
        <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {publishedWorks.map((work) => (
            <WorkCard
              key={work.work_id}
              work={work}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          まだ投稿された作品がありません
        </div>
      )}
    </div>
  )
}

export function WorksTabContent({ user, publishedWorks, draftWorks }: { user: UserWithStats; publishedWorks: Work[]; draftWorks: Work[] }) {
  const [activeWorksTab, setActiveWorksTab] = useState('published')

  const worksTabOptions = [
    { id: 'published', label: '投稿済みシリーズ', icon: <Library className="w-4 h-4" /> },
    { id: 'works', label: '投稿済み作品', icon: <FileText className="w-4 h-4" /> },
    { id: 'scheduled', label: '予約投稿', icon: <Clock className="w-4 h-4" /> }
  ]

  const renderWorksGrid = () => {
    let works: Work[] = []
    
    if (activeWorksTab === 'works') {
      works = publishedWorks
    } else if (activeWorksTab === 'published') {
      // For series, we could group by series_id, but for now show published works
      works = publishedWorks.filter(work => work.series_id)
    } else if (activeWorksTab === 'scheduled') {
      // For scheduled works, we would need a separate query
      works = []
    }

    if (works.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {activeWorksTab === 'published' && 'まだシリーズがありません'}
          {activeWorksTab === 'works' && 'まだ投稿された作品がありません'}
          {activeWorksTab === 'scheduled' && '予約投稿された作品がありません'}
        </div>
      )
    }

    return (
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {works.map((work) => (
          <WorkCard
            key={work.work_id}
            work={work}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Sub-tabs - Mobile first */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-hide">
          {worksTabOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveWorksTab(option.id)}
              className={cn(
                'py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                'whitespace-nowrap flex-shrink-0 flex items-center gap-2',
                activeWorksTab === option.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
              <span className="sm:hidden">
                {option.label.includes('シリーズ') ? 'シリーズ' :
                 option.label.includes('作品') ? '作品' : '予約'}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {renderWorksGrid()}
      </div>
    </>
  )
}

interface BookmarkFolder {
  id: string
  folder_key: string
  folder_name: string
  is_private: boolean
  is_system: boolean
  sort_order?: number
  work_count?: number
  thumbnail_url?: string
  last_updated?: string
}

export function LibraryTabContent({ user, likedWorks, bookmarkedWorks }: { user: UserWithStats; likedWorks: Work[]; bookmarkedWorks: Work[] }) {
  const [activeLibraryTab, setActiveLibraryTab] = useState('liked')
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [showFolderManager, setShowFolderManager] = useState(false)
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([])
  const [foldersWithCount, setFoldersWithCount] = useState<BookmarkFolder[]>([])
  const [folderWorks, setFolderWorks] = useState<Work[]>([])
  const [showFolderList, setShowFolderList] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isManagementMode, setIsManagementMode] = useState(false)

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ブックマークフォルダとフォルダ別作品を読み込み
  useEffect(() => {
    if (activeLibraryTab === 'bookmarked') {
      loadBookmarkFolders()
    }
  }, [activeLibraryTab])

  const loadBookmarkFolders = async () => {
    setLoading(true)
    try {
      const result = await getBookmarkFoldersAction()
      if (result.success) {
        const sortedFolders = result.folders.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        setBookmarkFolders(sortedFolders)
        setFoldersWithCount(sortedFolders)
      }
    } catch (error) {
      console.error('フォルダ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFolderWorks = async (folderKey: string) => {
    setLoading(true)
    try {
      const result = await getBookmarksByFolderAction(folderKey)
      if (result.success) {
        setFolderWorks(result.works)
        setSelectedFolder(folderKey)
        setShowFolderList(false)
        setIsManagementMode(false)
      }
    } catch (error) {
      console.error('フォルダ作品読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBookmark = async (workId: string) => {
    if (!confirm('この作品をフォルダから削除しますか？')) return
    
    setLoading(true)
    try {
      const result = await removeBookmarkFromFolderAction(workId, selectedFolder)
      if (result.success) {
        setFolderWorks(prev => prev.filter(work => work.work_id !== workId))
      } else {
        alert(result.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('ブックマーク削除エラー:', error)
      alert('削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleMoveBookmark = async (workId: string, toFolder: string) => {
    setLoading(true)
    try {
      const result = await moveBookmarkToFolderAction(workId, selectedFolder, toFolder)
      if (result.success) {
        setFolderWorks(prev => prev.filter(work => work.work_id !== workId))
        // フォルダカウントも更新
        loadBookmarkFolders()
      } else {
        alert(result.error || '移動に失敗しました')
      }
    } catch (error) {
      console.error('ブックマーク移動エラー:', error)
      alert('移動に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return
    
    if (active.id !== over.id) {
      const activeIndex = folderWorks.findIndex(work => work.work_id === active.id)
      const overIndex = folderWorks.findIndex(work => work.work_id === over.id)
      
      if (activeIndex !== -1 && overIndex !== -1) {
        // 楽観的更新
        const reorderedWorks = arrayMove(folderWorks, activeIndex, overIndex)
        setFolderWorks(reorderedWorks)
        
        // サーバー更新
        try {
          const result = await updateBookmarkOrderAction(
            active.id as string, 
            selectedFolder, 
            overIndex
          )
          if (!result.success) {
            // エラー時は元に戻す
            setFolderWorks(folderWorks)
            alert(result.error || '順序の更新に失敗しました')
          }
        } catch (error) {
          console.error('順序更新エラー:', error)
          setFolderWorks(folderWorks)
          alert('順序の更新に失敗しました')
        }
      }
    }
  }

  const libraryTabOptions = [
    { id: 'liked', label: 'いいねした作品', icon: <Heart className="w-4 h-4" />, count: likedWorks.length },
    { id: 'bookmarked', label: 'ブックマーク', icon: <Bookmark className="w-4 h-4" />, count: bookmarkedWorks.length },
    { id: 'history', label: '閲覧履歴', icon: <BookOpen className="w-4 h-4" />, count: 0 }
  ]

  const renderBookmarkFolders = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">読み込み中...</span>
        </div>
      )
    }

    if (bookmarkFolders.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Folder size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-2">フォルダがありません</p>
          <p className="text-sm">「フォルダ管理」からフォルダを作成してください</p>
        </div>
      )
    }

    // 「すべて」フォルダを最初に追加
    const allFolder = {
      id: 'all',
      folder_key: 'all',
      folder_name: 'すべてのブックマーク',
      is_private: false,
      is_system: false,
      sort_order: 0,
      work_count: bookmarkedWorks.length,
      thumbnail_url: bookmarkedWorks[0]?.image_url,
      last_updated: new Date().toISOString()
    }

    const foldersWithAll = [allFolder, ...bookmarkFolders]

    return (
      <div className="space-y-2">
        {foldersWithAll.map((folder) => (
          <div
            key={folder.folder_key}
            onClick={() => loadFolderWorks(folder.folder_key)}
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:shadow-md transition-all duration-200 cursor-pointer group"
          >
            {/* サムネイルエリア */}
            <div className="relative w-24 h-16 sm:w-32 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
              {folder.thumbnail_url ? (
                <img 
                  src={folder.thumbnail_url} 
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Folder size={24} className="text-gray-400" />
                </div>
              )}
              {/* 作品数バッジ */}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                {folder.work_count || 0} 作品
              </div>
            </div>

            {/* フォルダ情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {folder.folder_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {folder.is_private && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Lock size={12} />
                        プライベート
                      </span>
                    )}
                    {folder.is_system && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        システムフォルダ
                      </span>
                    )}
                    {!folder.is_system && folder.folder_key !== 'all' && folder.last_updated && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        最終更新: {new Date(folder.last_updated).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* アクションボタン（フォルダ管理時のみ表示） */}
                {!folder.is_system && folder.folder_key !== 'all' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: フォルダメニューを開く
                    }}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Settings size={16} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderFolderWorks = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">作品を読み込み中...</span>
        </div>
      )
    }

    if (folderWorks.length === 0) {
      return (
        <div className="space-y-6">
          {/* YouTube-style folder info bar */}
          {renderFolderInfoBar()}
          
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            このフォルダにはブックマークされた作品がありません
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* YouTube-style folder info bar */}
        {renderFolderInfoBar()}
        
        {/* Works grid with drag and drop */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={folderWorks.map(work => work.work_id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
              {folderWorks.map((work) => (
                <DraggableWorkCard
                  key={work.work_id}
                  work={work}
                  isManagementMode={isManagementMode}
                  onRemove={handleRemoveBookmark}
                  onMove={handleMoveBookmark}
                  availableFolders={bookmarkFolders
                    .filter(f => f.folder_key !== selectedFolder)
                    .map(f => ({ folder_key: f.folder_key, folder_name: f.folder_name }))
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    )
  }

  const renderFolderInfoBar = () => {
    const folder = selectedFolder === 'all' 
      ? {
          folder_key: 'all',
          folder_name: 'すべてのブックマーク',
          work_count: bookmarkedWorks.length,
          thumbnail_url: bookmarkedWorks[0]?.image_url,
          last_updated: new Date().toISOString(),
          is_private: false,
          is_system: false
        }
      : foldersWithCount.find(f => f.folder_key === selectedFolder)

    if (!folder) return null

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          <div className="relative w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
            {folder.thumbnail_url ? (
              <img
                src={folder.thumbnail_url}
                alt={folder.folder_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Bookmark className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {folder.work_count || folderWorks.length} 作品
            </div>
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {folder.folder_name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
              <span>{folder.work_count || folderWorks.length} 作品</span>
              <span>•</span>
              <span>ブックマークフォルダ</span>
              {folder.is_private && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    プライベート
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {isManagementMode ? (
                    <>
                      <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                        <GripVertical className="w-4 h-4" />
                        管理モード: ドラッグで並び替え、削除ボタンで作品を削除できます
                      </span>
                    </>
                  ) : (
                    selectedFolder === 'all' 
                      ? 'すべてのブックマークされた作品を表示しています。' 
                      : 'このフォルダにブックマークされた作品を表示しています。'
                  )}
                </p>
                {folder.last_updated && selectedFolder !== 'all' && !isManagementMode && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    最終更新: {new Date(folder.last_updated).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>
              
              {folderWorks.length > 0 && (
                <button
                  onClick={() => setIsManagementMode(!isManagementMode)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isManagementMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                  )}
                >
                  <Edit3 className="w-4 h-4" />
                  {isManagementMode ? '完了' : '管理'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderLibraryGrid = () => {
    let works: Work[] = []
    
    if (activeLibraryTab === 'liked') {
      works = likedWorks
    } else if (activeLibraryTab === 'bookmarked') {
      // ブックマークタブではフォルダ表示を優先
      if (showFolderList) {
        return renderBookmarkFolders()
      } else {
        return renderFolderWorks()
      }
    } else if (activeLibraryTab === 'history') {
      // For reading history, we would need a separate query
      works = []
    }

    if (works.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {activeLibraryTab === 'liked' && 'いいねした作品がありません'}
          {activeLibraryTab === 'history' && '閲覧履歴がありません'}
        </div>
      )
    }

    return (
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {works.map((work) => (
          <WorkCard
            key={work.work_id}
            work={work}
            isLiked={activeLibraryTab === 'liked'}
            isBookmarked={activeLibraryTab === 'bookmarked'}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeLibraryTab === 'bookmarked' && !showFolderList && (
            <button
              onClick={() => {
                setShowFolderList(true)
                setFolderWorks([])
                setSelectedFolder('all')
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              フォルダ一覧に戻る
            </button>
          )}
          {activeLibraryTab === 'bookmarked' && !showFolderList && (
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              📁 {selectedFolder === 'all' ? 'すべてのブックマーク' : 
                   bookmarkFolders.find(f => f.folder_key === selectedFolder)?.folder_name || 'フォルダ'}
            </h2>
          )}
        </div>
        {activeLibraryTab === 'bookmarked' && showFolderList && (
          <button
            onClick={() => setShowFolderManager(!showFolderManager)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">フォルダ管理</span>
          </button>
        )}
      </div>

      {/* Sub-tabs - Mobile first */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-hide">
          {libraryTabOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setActiveLibraryTab(option.id)
                setShowFolderManager(false)
                setShowFolderList(true)
                setFolderWorks([])
                setSelectedFolder('all')
              }}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 text-sm font-medium transition-colors',
                'whitespace-nowrap flex-shrink-0',
                activeLibraryTab === option.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
              <span className="sm:hidden">
                {option.label.includes('いいね') ? 'いいね' :
                 option.label.includes('ブックマーク') ? 'ブックマーク' : '履歴'}
              </span>
              {option.count > 0 && (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Folder Management Panel */}
      {showFolderManager && activeLibraryTab === 'bookmarked' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <BookmarkFolderManager
            userId={user.id}
            onFolderSelect={(folderKey) => {
              setSelectedFolder(folderKey)
              setShowFolderManager(false)
            }}
            selectedFolder={selectedFolder}
          />
        </div>
      )}

      {renderLibraryGrid()}
    </div>
  )
}

export function SettingsTabContent({ user, currentUserId }: { user: UserWithStats; currentUserId?: string | null }) {
  const isOwnProfile = currentUserId === user.id

  if (!isOwnProfile) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        設定は自分のプロフィールでのみ表示されます
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PrivacySettingsCard user={user} />
      <NotificationSettingsCard user={user} />
      <AccountSettingsCard user={user} />
    </div>
  )
}