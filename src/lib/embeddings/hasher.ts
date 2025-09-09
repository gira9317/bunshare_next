import crypto from 'crypto'

/**
 * SHA-256ハッシュを生成（差分チェック用）
 */
export function generateContentHash(content: string): string {
  if (!content || content.trim() === '') {
    return ''
  }
  
  return crypto
    .createHash('sha256')
    .update(content.trim(), 'utf8')
    .digest('hex')
}

/**
 * 作品の各要素のハッシュを生成
 */
export function generateWorkHashes(work: {
  title?: string | null
  content?: string | null
  tags?: string[] | null
  description?: string | null
}) {
  const titleHash = generateContentHash(work.title || '')
  const contentHash = generateContentHash(work.content || '')
  const descriptionHash = generateContentHash(work.description || '')
  const tagsHash = generateContentHash(JSON.stringify(work.tags || []))
  
  return {
    titleHash,
    contentHash,
    descriptionHash,
    tagsHash
  }
}

/**
 * チャンクのハッシュを生成
 */
export function generateChunkHash(chunkText: string, chunkIndex: number): string {
  const content = `${chunkIndex}:${chunkText.trim()}`
  return generateContentHash(content)
}

/**
 * ハッシュを比較して変更があったかチェック
 */
export function hasContentChanged(
  currentHashes: {
    titleHash: string
    contentHash: string
    descriptionHash: string
    tagsHash: string
  },
  existingHashes: {
    title_hash?: string | null
    content_hash?: string | null
    description_hash?: string | null
    tags_hash?: string | null
  }
): {
  hasChanged: boolean
  changedFields: string[]
} {
  const changedFields: string[] = []
  
  if (currentHashes.titleHash !== (existingHashes.title_hash || '')) {
    changedFields.push('title')
  }
  
  if (currentHashes.contentHash !== (existingHashes.content_hash || '')) {
    changedFields.push('content')
  }
  
  if (currentHashes.descriptionHash !== (existingHashes.description_hash || '')) {
    changedFields.push('description')
  }
  
  if (currentHashes.tagsHash !== (existingHashes.tags_hash || '')) {
    changedFields.push('tags')
  }
  
  return {
    hasChanged: changedFields.length > 0,
    changedFields
  }
}

/**
 * チャンクハッシュの配列を比較して変更を検出
 */
export function detectChunkChanges(
  newChunks: { text: string; index: number }[],
  existingChunks: { chunk_hash: string; chunk_index: number }[]
): {
  hasChanged: boolean
  changedChunks: number[]
  newChunksCount: number
  removedChunksCount: number
} {
  const newHashes = newChunks.map(chunk => ({
    index: chunk.index,
    hash: generateChunkHash(chunk.text, chunk.index)
  }))
  
  const existingHashMap = new Map(
    existingChunks.map(chunk => [chunk.chunk_index, chunk.chunk_hash])
  )
  
  const changedChunks: number[] = []
  
  // 新しいチャンクまたは変更されたチャンクを検出
  for (const newHash of newHashes) {
    const existingHash = existingHashMap.get(newHash.index)
    if (!existingHash || existingHash !== newHash.hash) {
      changedChunks.push(newHash.index)
    }
  }
  
  const newChunksCount = Math.max(0, newChunks.length - existingChunks.length)
  const removedChunksCount = Math.max(0, existingChunks.length - newChunks.length)
  
  return {
    hasChanged: changedChunks.length > 0 || newChunksCount > 0 || removedChunksCount > 0,
    changedChunks,
    newChunksCount,
    removedChunksCount
  }
}