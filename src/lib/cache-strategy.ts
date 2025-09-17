import { unstable_cache } from 'next/cache'

/**
 * キャッシュ戦略の設定
 * 異なるデータタイプに最適化されたTTL設定
 */
export const CACHE_CONFIG = {
  // 基本作品情報 - 長期キャッシュ（内容は変わりにくい）
  WORK_BASIC: {
    ttl: 3600, // 1時間
    tags: ['works'],
  },
  
  // 作品メタデータ - 超長期キャッシュ（SEO用、変更頻度極低）
  WORK_METADATA: {
    ttl: 7200, // 2時間
    tags: ['works', 'metadata'],
  },
  
  // ユーザー相互作用 - 短期キャッシュ（リアルタイム性重視）
  USER_INTERACTIONS: {
    ttl: 300, // 5分
    tags: ['user-interactions'],
  },
  
  // シリーズ情報 - 中期キャッシュ（変更頻度中）
  SERIES_DATA: {
    ttl: 1800, // 30分
    tags: ['series'],
  },
  
  // コメント数 - 短期キャッシュ（変動あり）
  COMMENTS_COUNT: {
    ttl: 600, // 10分
    tags: ['comments'],
  },
  
  // 読書履歴 - 短期キャッシュ（ユーザー固有）
  READING_HISTORY: {
    ttl: 900, // 15分
    tags: ['reading-history'],
  },
} as const

/**
 * 作品基本情報のキャッシュ関数
 */
export const getCachedWorkBasic = (workId: string) => 
  unstable_cache(
    async () => {
      // 基本的な作品情報のみ（軽量）
      return null // 実装は後でloaderから移動
    },
    [`work-basic-${workId}`],
    {
      revalidate: CACHE_CONFIG.WORK_BASIC.ttl,
      tags: CACHE_CONFIG.WORK_BASIC.tags,
    }
  )

/**
 * 作品メタデータのキャッシュ関数
 */
export const getCachedWorkMetadata = (workId: string) =>
  unstable_cache(
    async () => {
      // メタデータのみ（SEO用、最軽量）
      return null // 実装は後でloaderから移動
    },
    [`work-metadata-${workId}`],
    {
      revalidate: CACHE_CONFIG.WORK_METADATA.ttl,
      tags: CACHE_CONFIG.WORK_METADATA.tags,
    }
  )

/**
 * ユーザー相互作用のキャッシュ関数
 */
export const getCachedUserInteractions = (userId: string, workId: string) =>
  unstable_cache(
    async () => {
      // いいね、ブックマーク、読書進捗
      return null // 実装は後でloaderから移動
    },
    [`user-interactions-${userId}-${workId}`],
    {
      revalidate: CACHE_CONFIG.USER_INTERACTIONS.ttl,
      tags: [...CACHE_CONFIG.USER_INTERACTIONS.tags, `user-${userId}`],
    }
  )

/**
 * シリーズデータのキャッシュ関数
 */
export const getCachedSeriesData = (seriesId: string) =>
  unstable_cache(
    async () => {
      // シリーズの作品一覧
      return null // 実装は後でloaderから移動
    },
    [`series-data-${seriesId}`],
    {
      revalidate: CACHE_CONFIG.SERIES_DATA.ttl,
      tags: [...CACHE_CONFIG.SERIES_DATA.tags, `series-${seriesId}`],
    }
  )

/**
 * キャッシュタグの再検証ヘルパー
 */
export const revalidateWorkData = (workId: string) => {
  // 作品関連のキャッシュをすべて無効化
  return [
    'works',
    `work-${workId}`,
    'user-interactions',
    'comments',
  ]
}

export const revalidateUserData = (userId: string) => {
  // ユーザー関連のキャッシュを無効化
  return [
    `user-${userId}`,
    'user-interactions',
    'reading-history',
  ]
}