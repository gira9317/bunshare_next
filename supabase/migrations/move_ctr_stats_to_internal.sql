-- work_ctr_statsビューを_internalスキーマに移動
-- 推薦システムの統一とセキュリティ強化のため

BEGIN;

-- 1. 既存のpublicビューを削除（依存関係がある場合は後で再作成）
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

-- 3. アクセス権限設定（必要に応じて）
-- GRANT SELECT ON _internal.work_ctr_stats TO recommendation_system_role;

COMMIT;

-- 確認用クエリ
-- SELECT 'CTR stats view created in _internal schema. Sample records:', COUNT(*) FROM _internal.work_ctr_stats LIMIT 5;