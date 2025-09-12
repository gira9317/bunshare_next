-- work_embeddings_v2を_internalスキーマに移動
-- 推薦システムの一貫性とセキュリティ強化のため

BEGIN;

-- 1. _internal.work_embeddings_v2テーブルを作成
CREATE TABLE IF NOT EXISTS _internal.work_embeddings_v2 (
  id uuid not null default gen_random_uuid (),
  work_id uuid not null,
  
  -- 差分チェック用ハッシュ
  title_hash text null,
  content_hash text null,
  tags_hash text null,
  
  -- 埋め込みベクター（text-embedding-3-small: 1536次元）
  title_embedding public.vector(1536) null,
  description_embedding public.vector(1536) null,
  tags_embedding public.vector(1536) null,
  
  -- メタデータ
  embedding_model text null default 'text-embedding-3-small'::text,
  embedding_version integer null default 1,
  processing_status text null default 'pending'::text,
  
  -- コスト・パフォーマンス追跡
  tokens_used integer null default 0,
  api_cost_usd numeric(10,6) null default 0.00,
  processing_time_ms integer null,
  
  -- タイムスタンプ
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  last_processed_at timestamp with time zone null,
  
  constraint work_embeddings_v2_pkey primary key (id),
  constraint work_embeddings_v2_work_id_key unique (work_id),
  constraint work_embeddings_v2_work_id_fkey foreign key (work_id) references public.works (work_id) on delete cascade,
  constraint work_embeddings_v2_status_check check (processing_status in ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

-- 2. データを移行（存在する場合）
INSERT INTO _internal.work_embeddings_v2 
SELECT * FROM public.work_embeddings_v2
ON CONFLICT (work_id) DO NOTHING;

-- 3. インデックスを再作成
-- 基本インデックス
CREATE INDEX IF NOT EXISTS idx_work_embeddings_v2_work_id 
ON _internal.work_embeddings_v2 USING btree (work_id);

CREATE INDEX IF NOT EXISTS idx_work_embeddings_v2_status 
ON _internal.work_embeddings_v2 USING btree (processing_status);

CREATE INDEX IF NOT EXISTS idx_work_embeddings_v2_updated_at 
ON _internal.work_embeddings_v2 USING btree (updated_at);

CREATE INDEX IF NOT EXISTS idx_work_embeddings_v2_last_processed_at 
ON _internal.work_embeddings_v2 USING btree (last_processed_at);

-- 4. updated_atトリガー
CREATE TRIGGER trigger_work_embeddings_v2_updated_at 
BEFORE UPDATE ON _internal.work_embeddings_v2 
FOR EACH ROW 
EXECUTE FUNCTION set_updated_at();

-- 5. RLS無効化（_internalスキーマは信頼できる環境）
ALTER TABLE _internal.work_embeddings_v2 DISABLE ROW LEVEL SECURITY;

-- 6. 古いテーブルを削除（データ移行確認後）
-- DROP TABLE IF EXISTS public.work_embeddings_v2;

COMMIT;

-- 確認用クエリ
-- SELECT 'Migration completed. Records in _internal schema:', COUNT(*) FROM _internal.work_embeddings_v2;

-- ===================================================================
-- work_ctr_statsビューも_internalスキーマに移動（統合処理）
-- ===================================================================

-- 1. 既存のpublicビューを削除
DROP VIEW IF EXISTS public.work_ctr_stats;

-- 2. _internal.work_ctr_statsビューを作成
CREATE VIEW _internal.work_ctr_stats AS
WITH
  impression_stats AS (
    SELECT
      impressions_log.work_id,
      COUNT(*) AS impression_count,
      AVG(impressions_log.intersection_ratio) AS avg_intersection_ratio,
      AVG(impressions_log.display_duration) AS avg_display_duration
    FROM
      public.impressions_log
    WHERE
      impressions_log.impressed_at >= (NOW() - '30 days'::interval)
      AND impressions_log.intersection_ratio >= 0.5
      AND impressions_log.display_duration >= 1000
    GROUP BY
      impressions_log.work_id
  ),
  click_stats AS (
    SELECT
      views_log.work_id,
      COUNT(DISTINCT views_log.user_id) AS unique_clicks,
      COUNT(*) AS total_clicks
    FROM
      public.views_log
    WHERE
      views_log.viewed_at >= (NOW() - '30 days'::interval)
    GROUP BY
      views_log.work_id
  )
SELECT
  i.work_id,
  i.impression_count,
  COALESCE(c.unique_clicks, 0::bigint) AS unique_clicks,
  COALESCE(c.total_clicks, 0::bigint) AS total_clicks,
  CASE
    WHEN i.impression_count > 0 THEN COALESCE(c.unique_clicks, 0::bigint)::double precision / i.impression_count::double precision
    ELSE 0.0::double precision
  END AS ctr_unique,
  CASE
    WHEN i.impression_count > 0 THEN COALESCE(c.total_clicks, 0::bigint)::double precision / i.impression_count::double precision
    ELSE 0.0::double precision
  END AS ctr_total,
  i.avg_intersection_ratio,
  i.avg_display_duration
FROM
  impression_stats i
  LEFT JOIN click_stats c ON i.work_id = c.work_id;