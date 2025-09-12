# Edge Functions 推薦システム セキュリティ仕様

## 概要
本ドキュメントはBunshareのEdge Functions推薦システムにおけるセキュリティ設計と実装について説明します。

## アーキテクチャ
```
フロントエンド → Next.js API Routes → Supabase Edge Functions → _internal Schema
```

## セキュリティ層

### 1. データアクセス制御

#### プライベートスキーマ (`_internal`)
- **目的**: 重要なマテリアライズドビューを外部アクセスから隠蔽
- **対象テーブル**:
  - `_internal.popular_works_snapshot`
  - `_internal.user_preferences_cache`
  - `_internal.user_similarity_matrix`

#### 権限設定
```sql
-- 認証ユーザーには読み取り権限のみ
GRANT SELECT ON _internal.* TO authenticated;

-- サービスロール（Edge Functions）には全権限
GRANT ALL ON _internal.* TO service_role;
```

#### RLS (Row Level Security)
- `user_preferences_cache`: 自分のデータのみ閲覧可能
- `user_similarity_matrix`: 自分が関わるデータのみ閲覧可能
- `popular_works_snapshot`: 全ユーザー閲覧可能（但し認証必須）

### 2. レート制限

#### Edge Function レベル
- **制限**: 1分間に30リクエスト per IP
- **識別子**: クライアントIP (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`)
- **実装**: インメモリキャッシュ (Map)

#### API Routes レベル
- **通常API**: 1分間に60リクエスト per IP
- **More API**: 1分間に40リクエスト per IP (頻繁な利用を想定)
- **実装**: インメモリキャッシュ (Map)

#### レスポンスヘッダー
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 2025-01-15T10:00:00.000Z
```

### 3. リクエスト検証

#### Edge Function
- **Content-Type**: `application/json` 必須 (POST時)
- **Authorization**: `Bearer <token>` 形式必須
- **CORS**: プリフライト対応

#### Input Validation
- `userId`: 文字列 (オプション)
- `limit`: 1-100の範囲
- `offset`: 0以上の整数
- `strategy`: 'personalized' | 'adaptive' | 'popular'

### 4. セキュリティヘッダー

#### レスポンスヘッダー
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: GET, POST, OPTIONS
X-Engine: Edge Functions
X-Client-IP: <client-ip>
```

#### キャッシュ制御
- **認証ユーザー**: `private, max-age=300` (5分)
- **ゲストユーザー**: `public, max-age=600` (10分)
- **More API**: より短いキャッシュ時間

### 5. エラーハンドリング

#### レート制限超過 (429)
```json
{
  "error": "Rate Limit Exceeded",
  "retryAfter": 60,
  "engine": "Edge Functions"
}
```

#### リクエスト検証失敗 (400)
```json
{
  "error": "Invalid Request",
  "details": "Invalid Content-Type",
  "engine": "Edge Functions"
}
```

#### サーバーエラー (500)
```json
{
  "error": "Internal Server Error",
  "details": "Error message",
  "engine": "Edge Functions"
}
```

## 監視とログ

### Edge Function ログ
- リクエスト開始: IP、ユーザーID、パラメータ
- レート制限: 制限超過時の警告
- エラー: 詳細なエラー情報
- 処理時間: クエリ実行時間の追跡

### セキュリティ監視項目
- レート制限超過頻度
- 不正なリクエスト試行
- 異常なアクセスパターン
- Edge Function エラー率

## プロダクション推奨事項

### 1. レート制限の強化
- Redis/Memcached による分散レート制限
- ユーザーごとの個別制限
- 動的な制限調整

### 2. 認証強化
- JWTトークン検証の強化
- リフレッシュトークンの適切な管理
- セッション管理の改善

### 3. 監視強化
- Datadog/New Relic によるメトリクス監視
- アラート設定
- セキュリティダッシュボード

### 4. データベース最適化
- 接続プールの最適化
- クエリパフォーマンス監視
- インデックス最適化

## テスト用エンドポイント

### テストページ
- URL: `/edge-test`
- 機能: Edge Functions推薦システムの動作確認
- 戦略別テスト: 人気、適応、個人化

### API エンドポイント
- メイン: `/api/edge/recommendations`
- 追加取得: `/api/edge/recommendations/more`

## セキュリティチェックリスト

- [ ] プライベートスキーマの権限設定確認
- [ ] RLS ポリシーの動作確認
- [ ] レート制限の動作テスト
- [ ] CORS設定の確認
- [ ] エラーレスポンスの適切性確認
- [ ] ログ出力の動作確認
- [ ] 本番環境変数の設定確認