# Process Embeddings v2 Edge Function

OpenAI text-embedding-3-smallを使用した作品の自動埋め込み処理システム

## 機能概要

- **自動処理**: 15分間隔でcronにより実行
- **差分チェック**: SHA-256ハッシュによる変更検出
- **チャンク分割**: 1000トークン単位での長文分割（200トークンオーバーラップ）
- **コスト管理**: 月間予算制限とトークン使用量追跡
- **バッチ処理**: 最大50件の作品を一括処理

## セットアップ

### 1. 環境変数設定
```bash
# Supabase CLI経由で設定
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

### 2. データベーステーブル作成
```bash
# テーブル作成SQLを実行
psql -f supabase/table/work_embeddings_v2.sql
psql -f supabase/table/work_content_chunks_v2.sql
psql -f supabase/table/embedding_processing_logs_v2.sql
psql -f supabase/table/embedding_cost_tracking.sql
```

### 3. Cron設定
```sql
-- Supabase DashboardのSQL Editorで実行
-- cron.sqlの内容をコピーして実行
-- URLをプロジェクト固有のものに変更すること
```

### 4. Edge Function デプロイ
```bash
supabase functions deploy process-embeddings-v2
```

## API仕様

### POST /functions/v1/process-embeddings-v2

**リクエストボディ:**
```json
{
  "work_ids": ["uuid1", "uuid2"],     // 任意: 特定の作品IDを指定
  "force_reprocess": false,           // 任意: 強制再処理
  "max_cost_usd": 10.0,              // 任意: 月間コスト上限
  "batch_size": 20                   // 任意: バッチサイズ
}
```

**レスポンス:**
```json
{
  "batch_id": "uuid",
  "processed_works": 15,
  "skipped_works": 3,
  "failed_works": 0,
  "total_tokens_used": 25000,
  "total_cost_usd": 0.0005,
  "processing_time_ms": 45000
}
```

## 処理フロー

1. **作品取得**: 未処理または失敗した作品を優先的に取得
2. **差分チェック**: SHA-256ハッシュで変更を検出
3. **埋め込み生成**: 
   - タイトル（単一）
   - 説明（単一）
   - タグ（結合後単一）
   - コンテンツ（チャンク分割）
4. **コスト追跡**: 使用トークン数とコストを記録
5. **ログ記録**: 処理状況を詳細にログ

## コスト管理

- **単価**: $0.02 per 1M tokens
- **月間上限**: デフォルト$10.0
- **推定コスト**: 1作品あたり約$0.001-0.005
- **自動停止**: 月間上限に達した場合は処理を停止

## トラブルシューティング

### よくある問題

1. **Rate Limit エラー**
   - 3000 requests/minute制限に達した場合
   - バッチサイズを削減して再実行

2. **Content Too Long エラー**  
   - 8191トークン制限を超えた場合
   - チャンク分割サイズを小さくする

3. **Monthly Cost Exceeded**
   - 月間コスト上限に達した場合
   - `max_cost_usd`パラメータを調整

### ログ確認
```sql
-- 処理ログ確認
SELECT * FROM embedding_processing_logs_v2 
ORDER BY created_at DESC 
LIMIT 100;

-- コスト追跡確認  
SELECT * FROM embedding_cost_tracking
WHERE date >= current_date - interval '7 days'
ORDER BY date DESC;
```

## パフォーマンス

- **処理速度**: 約20作品/分
- **並列度**: 1バッチ内は順次処理
- **メモリ使用量**: 約128MB per batch
- **API制限**: OpenAI制限に準拠