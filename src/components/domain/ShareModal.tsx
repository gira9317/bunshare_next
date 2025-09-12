'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { recordShareAction } from '@/features/works/server/interactions'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  workId: string
  title: string
  author: string
  description?: string
}

export function ShareModal({ 
  isOpen, 
  onClose, 
  workId, 
  title, 
  author,
  description 
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/works/${workId}`
    : ''
  
  const shareText = `${title} by ${author}${description ? ` - ${description.slice(0, 100)}...` : ''}`

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
  }, [isOpen, mounted])

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      // シェア行動を記録
      await recordShareAction(workId, 'copy_link', shareUrl, shareText)
    } catch (error) {
      console.error('コピーに失敗しました:', error)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl,
        })
        
        // シェア行動を記録（シェアが成功した場合のみ）
        await recordShareAction(workId, 'native', shareUrl, shareText)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('シェアに失敗しました:', error)
        }
      }
    }
  }

  const shareToTwitter = async () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    
    // シェア行動を記録
    await recordShareAction(workId, 'twitter', shareUrl, shareText)
  }

  const shareToFacebook = async () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    
    // シェア行動を記録
    await recordShareAction(workId, 'facebook', shareUrl, shareText)
  }

  const shareToLine = async () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    
    // シェア行動を記録
    await recordShareAction(workId, 'line', shareUrl, shareText)
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
            作品をシェア
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Share URL */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            共有リンク
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            />
            <button
              onClick={handleCopy}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SNSでシェア
          </label>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="#1DA1F2" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              <span className="text-xs">Twitter</span>
            </button>

            <button
              onClick={shareToFacebook}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-xs">Facebook</span>
            </button>

            <button
              onClick={shareToLine}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="#00B900" viewBox="0 0 24 24">
                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992zm-18.988-2.595c.129 0 .234.105.234.234v4.153h2.287c.129 0 .233.105.233.234v.842c0 .129-.104.234-.233.234h-3.363c-.063 0-.119-.025-.161-.065l-.002-.002-.002-.002c-.04-.042-.065-.098-.065-.161V7.943c0-.129.105-.234.234-.234h.838zm14.992 0c.129 0 .234.105.234.234v.842c0 .129-.105.234-.234.234h-2.287v.883h2.287c.129 0 .234.105.234.234v.842c0 .129-.105.234-.234.234h-2.287v.884h2.287c.129 0 .234.105.234.233v.842c0 .129-.105.234-.234.234h-3.363c-.063 0-.12-.025-.162-.065l-.001-.002-.002-.002c-.04-.042-.065-.098-.065-.161V7.943c0-.063.025-.119.065-.161l.002-.002.002-.002c.042-.04.098-.065.161-.065h3.363zm-10.443.001c.129 0 .234.104.234.233v5.232c0 .128-.105.233-.234.233h-.842c-.129 0-.234-.105-.234-.233V7.943c0-.129.105-.233.234-.233h.842zm2.127 0h.008l.012.001.013.001.013.003.012.003.007.003.005.002.007.003.014.006.01.006.009.005.01.007.009.006.009.007.008.007.008.008.007.008.007.008.006.009.006.009.005.01.005.009.004.01.004.011.002.009.003.014v.005l.002.012.001.014v.012c0 .002 0 .005.001.007v3.383l2.133-3.415.007-.01.006-.008.007-.009.008-.008.008-.008.008-.008.008-.007.009-.007.01-.007.009-.005.009-.006.01-.005.012-.005.007-.003.006-.002.006-.002.013-.004.012-.002.012-.002.012-.001h.855c.129 0 .234.104.234.233v5.232c0 .128-.105.233-.234.233h-.841c-.13 0-.234-.105-.234-.233v-3.38l-2.133 3.414c-.044.07-.114.116-.194.123-.009.001-.017.001-.025.001h-.007l-.022-.001h-.005l-.019-.003-.01-.001-.01-.003-.018-.005-.012-.004-.013-.006-.011-.005-.007-.004-.006-.003-.011-.007-.011-.007-.007-.005-.005-.003-.012-.01-.011-.01-.008-.008-.004-.004-.003-.003-.009-.011-.009-.011-.006-.009-.003-.004-.002-.004-.006-.011-.006-.01-.004-.011-.001-.003-.001-.002-.003-.013-.003-.011-.001-.013-.001-.002v-.011c-.001-.003-.001-.006-.001-.009V7.943c0-.129.105-.233.234-.233h.841z"/>
              </svg>
              <span className="text-xs">LINE</span>
            </button>
          </div>
        </div>

        {/* Native Share (if available) */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={handleNativeShare}
            className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            その他のアプリでシェア
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}