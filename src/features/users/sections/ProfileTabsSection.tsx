'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
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
import { UnderlineTabs } from '@/components/shared/AnimatedTabs'
import { UserWithStats, Series } from '../schemas'
import { WorkCard } from '@/components/domain/WorkCard'
import type { Work } from '@/features/works/types'
import { SeriesCard } from '../components/SeriesCard'
import { BookmarkFolderCard } from '../components/BookmarkFolderCard'
import { BookmarkFolderManager } from '../leaf/BookmarkFolderManager'
import { getBookmarkFoldersAction, getBookmarksByFolderAction, updateBookmarkOrderAction, removeBookmarkFromFolderAction, moveBookmarkToFolderAction, getSeriesWorksAction, removeWorkFromSeriesAction, updateSeriesWorkOrderAction, getMoreReadingHistoryAction } from '@/features/works/server/actions'
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')
  const [isLoading, setIsLoading] = useState(false)

  // URLパラメータの変更を監視
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam)
      setIsLoading(false)
    } else if (!tabParam && defaultTab) {
      setActiveTab(defaultTab)
      setIsLoading(false)
    }
  }, [searchParams, tabs, defaultTab])

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  // タブ変更時にURLも更新
  const handleTabChange = (tabId: string) => {
    // ローディング表示を開始
    setIsLoading(true)
    
    // 即座にタブを切り替え
    setActiveTab(tabId)
    
    // 少し遅延してローディングを解除（コンテンツが切り替わった感を演出）
    setTimeout(() => setIsLoading(false), 150)
    
    // URLパラメータを非同期で更新（UIブロックを防ぐ）
    requestAnimationFrame(() => {
      const params = new URLSearchParams(searchParams)
      if (tabId === 'dashboard') {
        params.delete('tab')
      } else {
        params.set('tab', tabId)
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      
      // shallow routingで高速化
      window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        '',
        newUrl
      )
    })
  }

  // AnimatedTabsに対応したタブデータを作成
  const animatedTabs = tabs.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon
  }));

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation with AnimatedTabs */}
      <UnderlineTabs
        tabs={animatedTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        size="md"
        showCounts={false}
        scrollable={true}
      />

      {/* Tab Content */}
      <div className="min-h-[400px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="relative">
              <div className="w-10 h-10 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-10 h-10 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
        )}
        <div className={cn(
          "transition-opacity duration-150",
          isLoading ? "opacity-50" : "opacity-100"
        )}>
          {activeTabContent}
        </div>
      </div>
    </div>
  )
}

// Draggable WorkCard Wrapper for Series Management
function DraggableSeriesWorkCard({ 
  work, 
  onRemove 
}: { 
  work: Work; 
  onRemove: (workId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: work.work_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative group"
    >
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        <button
          {...attributes}
          {...listeners}
          className="p-1 bg-gray-900/80 text-white rounded hover:bg-gray-50/80 transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(work.work_id)}
          className="p-1 bg-red-600/80 text-white rounded hover:bg-red-500/80 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Episode number badge - only in management mode */}
      <div className="absolute top-2 right-2 z-10 bg-purple-600/90 text-white px-2 py-1 rounded-full text-xs font-semibold">
        第{work.episode_number || 1}話
      </div>
      
      <WorkCard work={work} isManagementMode={true} disableContinueDialog={true} />
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
        isManagementMode && 'ring-2 ring-blue-200 rounded-lg bg-blue-50/30',
        isDragging && 'z-50 opacity-75 scale-105 rotate-2 shadow-2xl ring-4 ring-blue-300'
      )}
    >
      {/* Management Mode Overlay - ボタンを個別に配置 */}
      {isManagementMode && (
        <>
          {/* Drag Handle */}
          <div 
            className="absolute top-2 left-2 z-20 flex items-center justify-center w-10 h-10 bg-white/95 rounded-xl shadow-lg border border-gray-200/50 cursor-grab active:cursor-grabbing hover:bg-blue-900/30 transition-colors"
            {...attributes} 
            {...listeners}
          >
            <GripVertical className="w-5 h-5 text-gray-600" />
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
        disableContinueDialog={true}
      />
    </div>
  )
}

// Tab content components
export function DashboardTabContent({ user, publishedWorks, userLikes = [], userBookmarks = [] }: { user: UserWithStats; publishedWorks: Work[]; userLikes?: string[]; userBookmarks?: string[] }) {
  return (
    <div className="space-y-4">
      {publishedWorks.length > 0 ? (
        <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {publishedWorks.map((work) => (
            <WorkCard
              key={work.work_id}
              work={work}
              isLiked={userLikes.includes(work.work_id)}
              isBookmarked={userBookmarks.includes(work.work_id)}
              disableContinueDialog={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          まだ投稿された作品がありません
        </div>
      )}
    </div>
  )
}

export function WorksTabContent({ user, publishedWorks, draftWorks, userSeries, userLikes = [], userBookmarks = [] }: { user: UserWithStats; publishedWorks: Work[]; draftWorks: Work[]; userSeries?: Series[]; userLikes?: string[]; userBookmarks?: string[] }) {
  const [activeWorksTab, setActiveWorksTab] = useState('published')
  const [showSeriesList, setShowSeriesList] = useState(true)
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)
  const [seriesWorks, setSeriesWorks] = useState<Work[]>([])
  const [isSeriesManagementMode, setIsSeriesManagementMode] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const worksTabOptions = [
    { id: 'published', label: '投稿済みシリーズ', icon: <Library className="w-4 h-4" /> },
    { id: 'works', label: '投稿済み作品', icon: <FileText className="w-4 h-4" /> },
    { id: 'scheduled', label: '予約投稿', icon: <Clock className="w-4 h-4" /> }
  ]

  const handleSeriesClick = async (seriesId: string) => {
    const result = await getSeriesWorksAction(seriesId)
    if (result.success) {
      setSeriesWorks(result.works || [])
      setSelectedSeries(seriesId)
      setShowSeriesList(false)
      setIsSeriesManagementMode(false)
    } else {
      console.error('Failed to fetch series works:', result.error)
    }
  }

  const handleSeriesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSeriesWorks((works) => {
        const oldIndex = works.findIndex((work) => work.work_id === active.id)
        const newIndex = works.findIndex((work) => work.work_id === over.id)

        const reorderedWorks = arrayMove(works, oldIndex, newIndex)
        
        // Update episode numbers based on new order
        const updatedWorks = reorderedWorks.map((work, index) => ({
          ...work,
          episode_number: index + 1
        }))

        // Update server with new order
        updateSeriesWorkOrderAction(
          updatedWorks.map(work => ({
            work_id: work.work_id,
            episode_number: work.episode_number
          }))
        )
        
        return updatedWorks
      })
    }
  }

  const handleRemoveWorkFromSeries = async (workId: string) => {
    if (!selectedSeries) return

    const result = await removeWorkFromSeriesAction(workId)
    if (result.success) {
      setSeriesWorks(works => works.filter(w => w.work_id !== workId))
    } else {
      console.error('Failed to remove work from series:', result.error)
    }
  }

  const renderSeriesWorks = () => {
    const selectedSeriesData = userSeries?.find(s => s.id === selectedSeries)
    
    if (seriesWorks.length === 0) {
      return (
        <div className="space-y-6">
          {/* Series Info Header */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Library className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {selectedSeriesData?.title || 'シリーズ'}
                    </h1>
                    <p className="text-sm text-gray-600">
                      作品数: {selectedSeriesData?.works_count || 0}話
                    </p>
                  </div>
                </div>
                {selectedSeriesData?.description && (
                  <p className="text-sm text-gray-700 mb-3">
                    {selectedSeriesData.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-center py-12 text-gray-500">
            このシリーズには作品がありません
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Series Info Header */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Library className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {selectedSeriesData?.title || 'シリーズ'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    作品数: {seriesWorks.length}話 • 最終更新: {new Date().toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
              {selectedSeriesData?.description && (
                <p className="text-sm text-gray-700 mb-3">
                  {selectedSeriesData.description}
                </p>
              )}
            </div>
            
            <button
              onClick={() => setIsSeriesManagementMode(!isSeriesManagementMode)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isSeriesManagementMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-600 hover:border-blue-400'
              )}
            >
              <Edit3 className="w-4 h-4" />
              {isSeriesManagementMode ? '完了' : '管理'}
            </button>
          </div>
        </div>

        {/* Works Grid */}
        {isSeriesManagementMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSeriesDragEnd}
          >
            <SortableContext 
              items={seriesWorks.map(w => w.work_id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                {seriesWorks.map((work) => (
                  <DraggableSeriesWorkCard
                    key={work.work_id}
                    work={work}
                    onRemove={handleRemoveWorkFromSeries}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {seriesWorks.map((work) => (
              <WorkCard
                key={work.work_id}
                work={work}
                isLiked={userLikes.includes(work.work_id)}
                isBookmarked={userBookmarks.includes(work.work_id)}
                disableContinueDialog={true}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderWorksGrid = () => {
    if (activeWorksTab === 'published') {
      // Show series detail view or series list
      if (!showSeriesList) {
        return renderSeriesWorks()
      }
      
      // Show series list
      if (!userSeries || userSeries.length === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            まだシリーズがありません
          </div>
        )
      }
      return (
        <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {userSeries.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              onClick={() => handleSeriesClick(series.id)}
            />
          ))}
        </div>
      )
    } else if (activeWorksTab === 'works') {
      // Show published works
      if (publishedWorks.length === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            まだ投稿された作品がありません
          </div>
        )
      }
      return (
        <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {publishedWorks.map((work) => (
            <WorkCard
              key={work.work_id}
              work={work}
              isLiked={userLikes.includes(work.work_id)}
              isBookmarked={userBookmarks.includes(work.work_id)}
              disableContinueDialog={true}
            />
          ))}
        </div>
      )
    } else if (activeWorksTab === 'scheduled') {
      // For scheduled works, we would need a separate query
      return (
        <div className="text-center py-12 text-gray-500">
          予約投稿された作品がありません
        </div>
      )
    }
  }

  return (
    <>
      {/* Back button and title for series detail view */}
      {activeWorksTab === 'published' && !showSeriesList && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowSeriesList(true)
                setSeriesWorks([])
                setSelectedSeries(null)
                setIsSeriesManagementMode(false)
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hovertext-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              シリーズ一覧に戻る
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              📚 {userSeries?.find(s => s.id === selectedSeries)?.title || 'シリーズ'}
            </h2>
          </div>
        </div>
      )}

      {/* Sub-tabs with AnimatedTabs */}
      <UnderlineTabs
        tabs={worksTabOptions}
        activeTab={activeWorksTab}
        onTabChange={(tab) => {
          setActiveWorksTab(tab)
          setShowSeriesList(true)
          setSeriesWorks([])
          setSelectedSeries(null)
          setIsSeriesManagementMode(false)
        }}
        size="sm"
        showCounts={false}
        scrollable={true}
      />

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

export function LibraryTabContent({ user, likedWorks, bookmarkedWorks, readingHistory: initialReadingHistory = [] }: { user: UserWithStats; likedWorks: Work[]; bookmarkedWorks: Work[]; readingHistory?: Work[] }) {
  const [activeLibraryTab, setActiveLibraryTab] = useState('liked')
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [showFolderManager, setShowFolderManager] = useState(false)
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>([])
  const [foldersWithCount, setFoldersWithCount] = useState<BookmarkFolder[]>([])
  const [folderWorks, setFolderWorks] = useState<Work[]>([])
  const [showFolderList, setShowFolderList] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isManagementMode, setIsManagementMode] = useState(false)
  
  // 閲覧履歴関連のstate
  const [readingHistory, setReadingHistory] = useState<Work[]>(initialReadingHistory)
  const [historyPage, setHistoryPage] = useState(0)
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(initialReadingHistory.length === 6)

  // もっと表示するボタンの処理
  const loadMoreHistory = async () => {
    if (loadingMoreHistory || !hasMoreHistory) return
    
    setLoadingMoreHistory(true)
    try {
      const nextPage = historyPage + 1
      const offset = nextPage * 6
      const result = await getMoreReadingHistoryAction(user.id, 6, offset)
      
      if (result.success && result.works && result.works.length > 0) {
        setReadingHistory(prev => [...prev, ...result.works])
        setHistoryPage(nextPage)
        // 6件未満の場合は最後のページ
        if (result.works.length < 6) {
          setHasMoreHistory(false)
        }
      } else {
        setHasMoreHistory(false)
        if (result.error) {
          console.error('閲覧履歴の追加読み込みエラー:', result.error)
        }
      }
    } catch (error) {
      console.error('閲覧履歴の追加読み込みエラー:', error)
    } finally {
      setLoadingMoreHistory(false)
    }
  }

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
        
        // サーバー更新 - 全てのアイテムの新しい順序を送信
        try {
          const workOrders = reorderedWorks.map((work, index) => ({
            work_id: work.work_id,
            sort_order: index + 1  // 1ベースの順序番号
          }))
          
          const result = await updateBookmarkOrderAction(selectedFolder, workOrders)
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
    { id: 'liked', label: 'いいね', icon: <Heart className="w-4 h-4" />, count: likedWorks.length },
    { id: 'bookmarked', label: 'ブックマーク', icon: <Bookmark className="w-4 h-4" />, count: bookmarkedWorks.length },
    { id: 'history', label: '履歴', icon: <BookOpen className="w-4 h-4" />, count: readingHistory.length }
  ]

  const renderBookmarkFolders = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3"></div>
          <span className="text-gray-600">読み込み中...</span>
        </div>
      )
    }

    if (bookmarkFolders.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
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
      work_thumbnails: bookmarkedWorks.slice(0, 3).map(work => work.image_url).filter(Boolean),
      last_updated: new Date().toISOString()
    }

    const foldersWithAll = [allFolder, ...bookmarkFolders]
    
    // 作品が入っていないフォルダを除外（デフォルトフォルダは除く）
    const visibleFolders = foldersWithAll.filter(folder => {
      // 「すべて」フォルダは常に表示
      if (folder.folder_key === 'all') return true
      // デフォルトフォルダは常に表示
      if (folder.folder_key === 'default') return true
      // その他は作品がある場合のみ表示
      return (folder.work_count || 0) > 0
    })

    return (
      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {visibleFolders.map((folder) => (
          <BookmarkFolderCard
            key={folder.folder_key}
            folder={folder}
            onFolderClick={loadFolderWorks}
            showSettings={true}
          />
        ))}
      </div>
    )
  }

  const renderFolderWorks = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3"></div>
          <span className="text-gray-600">作品を読み込み中...</span>
        </div>
      )
    }

    if (folderWorks.length === 0) {
      return (
        <div className="space-y-6">
          {/* YouTube-style folder info bar */}
          {renderFolderInfoBar()}
          
          <div className="text-center py-12 text-gray-500">
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          <div className="relative w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {folder.folder_name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
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
                <p className="text-gray-700 text-sm leading-relaxed">
                  {isManagementMode ? (
                    <>
                      <span className="inline-flex items-center gap-2 text-blue-600 font-medium">
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
                  <p className="text-xs text-gray-500 mt-2">
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
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-600 hover:border-blue-400'
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
      // 閲覧履歴の表示
      if (readingHistory.length === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            閲覧履歴がありません
          </div>
        )
      }

      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {readingHistory.map((work) => (
              <WorkCard
                key={work.work_id}
                work={work}
                isLiked={false}
                isBookmarked={false}
                hasReadingProgress={true}
                readingProgress={work.readingProgress || 0}
                disableContinueDialog={false}
              />
            ))}
          </div>
          
          {/* もっと表示するボタン */}
          {hasMoreHistory && (
            <div className="flex justify-center">
              <button
                onClick={loadMoreHistory}
                disabled={loadingMoreHistory}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium transition-all',
                  'bg-purple-100 text-purple-700',
                  'hover:bg-purple-900/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {loadingMoreHistory ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    読み込み中...
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    もっと表示する
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )
    }

    if (works.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {activeLibraryTab === 'liked' && 'いいねした作品がありません'}
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
            disableContinueDialog={true}
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
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hovertext-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              フォルダ一覧に戻る
            </button>
          )}
          {activeLibraryTab === 'bookmarked' && !showFolderList && (
            <h2 className="text-xl font-bold text-gray-900">
              📁 {selectedFolder === 'all' ? 'すべてのブックマーク' : 
                   bookmarkFolders.find(f => f.folder_key === selectedFolder)?.folder_name || 'フォルダ'}
            </h2>
          )}
        </div>
      </div>

      {/* Sub-tabs with AnimatedTabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <UnderlineTabs
            tabs={libraryTabOptions}
            activeTab={activeLibraryTab}
            onTabChange={(tab) => {
              setActiveLibraryTab(tab)
              setShowFolderManager(false)
              setShowFolderList(true)
              setFolderWorks([])
              setSelectedFolder('all')
            }}
            size="sm"
            showCounts={true}
            scrollable={true}
            className="flex-1"
          />
          
          {/* Folder Management Button - Tab Right (Desktop only) */}
          {activeLibraryTab === 'bookmarked' && showFolderList && (
            <button
              onClick={() => setShowFolderManager(!showFolderManager)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors ml-4 flex-shrink-0"
            >
              <Settings size={16} />
              <span>フォルダ管理</span>
            </button>
          )}
        </div>
      </div>

      {/* Folder Management Button - Mobile (Below tabs) */}
      {activeLibraryTab === 'bookmarked' && showFolderList && (
        <div className="sm:hidden px-4 mb-4">
          <button
            onClick={() => setShowFolderManager(!showFolderManager)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Settings size={16} />
            <span>フォルダ管理</span>
          </button>
        </div>
      )}

      {/* Folder Management Panel */}
      {showFolderManager && activeLibraryTab === 'bookmarked' && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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
      <div className="text-center py-12 text-gray-500">
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