/**
 * 日本時間（JST）とUTC時間の変換ユーティリティ
 * 日本は UTC+9 なので、9時間の差がある
 */

/**
 * 現在の日本時間をUTC ISO文字列として返す
 */
export function getJSTAsUTC(): string {
  return new Date().toISOString()
}

/**
 * 日本時間の Date オブジェクトを UTC ISO文字列に変換
 */
export function convertJSTToUTC(jstDate: Date): string {
  return jstDate.toISOString()
}

/**
 * UTC ISO文字列を日本時間の Date オブジェクトに変換
 */
export function convertUTCToJST(utcString: string): Date {
  return new Date(utcString)
}

/**
 * datetime-local入力値（日本時間）をUTC ISO文字列に変換
 * datetime-local は "2024-01-15T10:30" 形式で、日本時間として解釈される
 */
export function convertLocalDateTimeToUTC(localDateTime: string): string {
  console.log('🔍 [convertLocalDateTimeToUTC] Input:', localDateTime)
  
  // datetime-local の値を日本時間として明示的に解釈
  // 例: "2024-01-15T10:30" → 日本時間の2024-01-15 10:30 → UTC時間に変換
  
  // 方法1: 単純にUTC時間として扱い、9時間引く
  const tempDate = new Date(localDateTime + ':00Z')  // UTCとして一時的に解釈
  console.log('🔍 [convertLocalDateTimeToUTC] Temp UTC Date:', tempDate.toISOString())
  
  // 9時間引く（日本時間→UTC変換）
  const utcTime = tempDate.getTime() - (9 * 60 * 60 * 1000)
  const utcDate = new Date(utcTime)
  const utcResult = utcDate.toISOString()
  
  console.log('🔍 [convertLocalDateTimeToUTC] Result UTC after -9h:', utcResult)
  console.log('🔍 [convertLocalDateTimeToUTC] Current time:', new Date().toISOString())
  console.log('🔍 [convertLocalDateTimeToUTC] Time difference (minutes):', (utcDate.getTime() - Date.now()) / (1000 * 60))
  
  return utcResult
}

/**
 * UTC ISO文字列を datetime-local 入力用の形式に変換
 * "2024-01-15T10:30" 形式で返す（ローカル時間として表示される）
 */
export function convertUTCToLocalDateTime(utcString: string): string {
  const date = new Date(utcString)
  // ローカル時間での年月日時分を取得
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * 日本時間で1時間後の datetime-local 形式を取得（予約投稿のデフォルト値用）
 */
export function getMinDateTimeJST(): string {
  const now = new Date()
  now.setHours(now.getHours() + 1)
  return convertUTCToLocalDateTime(now.toISOString())
}

/**
 * 日本時間での日付フォーマット
 */
export function formatJSTDate(utcString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = convertUTCToJST(utcString)
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  }
  
  return date.toLocaleDateString('ja-JP', { ...defaultOptions, ...options })
}

/**
 * 日本時間での日時フォーマット
 */
export function formatJSTDateTime(utcString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = convertUTCToJST(utcString)
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  }
  
  return date.toLocaleDateString('ja-JP', { ...defaultOptions, ...options })
}