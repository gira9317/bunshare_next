// テキストチャンク分割ユーティリティ

const CHUNK_SIZE = 1000 // トークン数
const CHUNK_OVERLAP = 200 // オーバーラップトークン数
const SEPARATORS = ['\n\n', '\n', '。', '！', '？', '、', ' ', '']

/**
 * 文字数からトークン数を大まかに推定
 * 実際の本番環境では tiktoken ライブラリを使用すべき
 */
function estimateTokens(text: string): number {
  // 日本語は文字数の約1.5倍、英語は文字数の約0.25倍のトークン数
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
  const otherChars = text.length - japaneseChars
  
  return Math.ceil(japaneseChars * 1.5 + otherChars * 0.25)
}

/**
 * テキストを指定されたセパレーターで分割
 */
function splitText(text: string, separators: string[]): string[] {
  if (separators.length === 0) {
    return [text]
  }

  const [separator, ...remainingSeparators] = separators
  const parts = text.split(separator)

  if (parts.length === 1) {
    // このセパレーターで分割できない場合、次のセパレーターを試す
    return splitText(text, remainingSeparators)
  }

  // 分割できた場合、各部分をさらに分割する可能性を検討
  const result: string[] = []
  for (const part of parts) {
    if (estimateTokens(part) > CHUNK_SIZE && remainingSeparators.length > 0) {
      result.push(...splitText(part, remainingSeparators))
    } else {
      result.push(part)
    }
  }

  return result.filter(chunk => chunk.trim().length > 0)
}

/**
 * チャンクを結合して適切なサイズにする
 */
function mergeChunks(chunks: string[]): string[] {
  if (chunks.length === 0) return []

  const result: string[] = []
  let currentChunk = ''
  let currentTokens = 0

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk)
    
    // 単一チャンクが最大サイズを超える場合
    if (chunkTokens > CHUNK_SIZE) {
      // 現在のチャンクを保存
      if (currentChunk) {
        result.push(currentChunk.trim())
        currentChunk = ''
        currentTokens = 0
      }
      
      // 大きなチャンクを強制的に分割
      const forceSplit = forceChunkSplit(chunk, CHUNK_SIZE)
      result.push(...forceSplit)
      continue
    }

    // 追加しても制限内に収まる場合
    if (currentTokens + chunkTokens <= CHUNK_SIZE) {
      currentChunk += (currentChunk ? '\n' : '') + chunk
      currentTokens += chunkTokens
    } else {
      // 現在のチャンクを保存して新しいチャンクを開始
      if (currentChunk) {
        result.push(currentChunk.trim())
      }
      currentChunk = chunk
      currentTokens = chunkTokens
    }
  }

  // 最後のチャンクを追加
  if (currentChunk) {
    result.push(currentChunk.trim())
  }

  return result
}

/**
 * 大きなテキストを強制的に分割
 */
function forceChunkSplit(text: string, maxTokens: number): string[] {
  const estimatedTokensPerChar = estimateTokens(text) / text.length
  const maxChars = Math.floor(maxTokens / estimatedTokensPerChar)
  
  const result: string[] = []
  for (let i = 0; i < text.length; i += maxChars) {
    const chunk = text.slice(i, i + maxChars)
    result.push(chunk)
  }
  
  return result
}

/**
 * オーバーラップを追加
 */
function addOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks

  const result: string[] = []
  
  for (let i = 0; i < chunks.length; i++) {
    let chunkWithOverlap = chunks[i]
    
    // 前のチャンクからのオーバーラップを追加
    if (i > 0) {
      const prevChunk = chunks[i - 1]
      const overlapText = getOverlapText(prevChunk, CHUNK_OVERLAP)
      if (overlapText) {
        chunkWithOverlap = overlapText + '\n' + chunkWithOverlap
      }
    }
    
    result.push(chunkWithOverlap)
  }
  
  return result
}

/**
 * 指定されたトークン数分の末尾テキストを取得
 */
function getOverlapText(text: string, maxTokens: number): string {
  const sentences = text.split(/[。！？]/);
  let overlapText = ''
  let tokenCount = 0
  
  // 文末から逆順にチェック
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i]
    const sentenceTokens = estimateTokens(sentence)
    
    if (tokenCount + sentenceTokens <= maxTokens) {
      overlapText = sentence + overlapText
      tokenCount += sentenceTokens
    } else {
      break
    }
  }
  
  return overlapText.trim()
}

/**
 * メインのチャンク分割関数
 */
export function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // テキストが短い場合はそのまま返す
  if (estimateTokens(text) <= CHUNK_SIZE) {
    return [text.trim()]
  }

  console.log(`Chunking text: ${text.length} characters, estimated ${estimateTokens(text)} tokens`)

  // 1. テキストを分割
  const initialChunks = splitText(text, SEPARATORS)
  console.log(`Initial split: ${initialChunks.length} chunks`)

  // 2. チャンクを適切なサイズにマージ
  const mergedChunks = mergeChunks(initialChunks)
  console.log(`After merging: ${mergedChunks.length} chunks`)

  // 3. オーバーラップを追加
  const finalChunks = addOverlap(mergedChunks)
  console.log(`Final chunks: ${finalChunks.length}`)

  // 4. 各チャンクのサイズを検証
  finalChunks.forEach((chunk, index) => {
    const tokens = estimateTokens(chunk)
    if (tokens > CHUNK_SIZE * 1.2) { // 20%の余裕を持たせる
      console.warn(`Chunk ${index} is oversized: ${tokens} tokens`)
    }
  })

  return finalChunks
}

/**
 * チャンク分割の統計情報を取得
 */
export function getChunkStats(text: string): {
  originalLength: number
  estimatedTokens: number
  chunksCount: number
  averageChunkSize: number
  maxChunkSize: number
  minChunkSize: number
} {
  const chunks = chunkText(text)
  const chunkSizes = chunks.map(chunk => estimateTokens(chunk))

  return {
    originalLength: text.length,
    estimatedTokens: estimateTokens(text),
    chunksCount: chunks.length,
    averageChunkSize: chunkSizes.length > 0 ? Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length) : 0,
    maxChunkSize: Math.max(...chunkSizes, 0),
    minChunkSize: Math.min(...chunkSizes, 0)
  }
}