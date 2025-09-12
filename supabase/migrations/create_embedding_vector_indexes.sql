-- ベクトルインデックス作成（メモリ最適化版）
-- maintenance_work_memエラー回避のため分離実行

-- メモリ制限を一時的に増加（Supabaseで許可されている場合のみ）
SET maintenance_work_mem = '128MB';
SET max_parallel_maintenance_workers = 2;

-- データ量チェック（事前確認）
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_embeddings
FROM _internal.work_embeddings_v2;

-- ベクトル検索用インデックス作成（通常のCREATE INDEXを使用）
-- 完成したエンベディングが存在する場合のみ実行
CREATE INDEX IF NOT EXISTS idx_work_embeddings_v2_title_cosine 
ON _internal.work_embeddings_v2 USING ivfflat (title_embedding vector_cosine_ops)
WITH (lists = 10)  -- 小さな値から開始
WHERE processing_status = 'completed' AND title_embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_embeddings_v2_description_cosine 
ON _internal.work_embeddings_v2 USING ivfflat (description_embedding vector_cosine_ops)
WITH (lists = 10)
WHERE processing_status = 'completed' AND description_embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_embeddings_v2_tags_cosine 
ON _internal.work_embeddings_v2 USING ivfflat (tags_embedding vector_cosine_ops)
WITH (lists = 10)
WHERE processing_status = 'completed' AND tags_embedding IS NOT NULL;

-- メモリ設定を元に戻す
RESET maintenance_work_mem;
RESET max_parallel_maintenance_workers;

-- 確認
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = '_internal' 
  AND tablename = 'work_embeddings_v2'
  AND indexname LIKE '%cosine%';