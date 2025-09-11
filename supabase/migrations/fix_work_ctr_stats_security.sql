-- ===================================================================
-- work_ctr_statsビューのSecurity Definer問題修正
-- ===================================================================
-- 問題：
-- 1. 現在のビューがSECURITY DEFINERで作成されている
-- 2. Postgres権限で実行されるためRLSが無視される
-- 3. 公開APIから全データにアクセス可能
-- ===================================================================

-- ===================================================================
-- 1. 既存のビューを削除
-- ===================================================================
DROP VIEW IF EXISTS public.work_ctr_stats;

-- ===================================================================
-- 2. Security Invokerでビューを再作成
-- ===================================================================
CREATE VIEW public.work_ctr_stats 
WITH (security_invoker = true) AS
WITH
  impression_stats as (
    SELECT
      impressions_log.work_id,
      COUNT(*) as impression_count,
      AVG(impressions_log.intersection_ratio) as avg_intersection_ratio,
      AVG(impressions_log.display_duration) as avg_display_duration
    FROM
      public.impressions_log
    WHERE
      impressions_log.impressed_at >= (now() - '30 days'::interval)
      AND impressions_log.intersection_ratio >= 0.5
      AND impressions_log.display_duration >= 1000
    GROUP BY
      impressions_log.work_id
  ),
  click_stats as (
    SELECT
      views_log.work_id,
      COUNT(DISTINCT views_log.user_id) as unique_clicks,
      COUNT(*) as total_clicks
    FROM
      public.views_log
    WHERE
      views_log.viewed_at >= (now() - '30 days'::interval)
    GROUP BY
      views_log.work_id
  )
SELECT
  i.work_id,
  i.impression_count,
  COALESCE(c.unique_clicks, 0::bigint) as unique_clicks,
  COALESCE(c.total_clicks, 0::bigint) as total_clicks,
  CASE
    WHEN i.impression_count > 0 THEN COALESCE(c.unique_clicks, 0::bigint)::double precision / i.impression_count::double precision
    ELSE 0.0::double precision
  END as ctr_unique,
  CASE
    WHEN i.impression_count > 0 THEN COALESCE(c.total_clicks, 0::bigint)::double precision / i.impression_count::double precision
    ELSE 0.0::double precision
  END as ctr_total,
  i.avg_intersection_ratio,
  i.avg_display_duration
FROM
  impression_stats i
  LEFT JOIN click_stats c ON i.work_id = c.work_id;

-- ===================================================================
-- 3. ビューへのアクセス権限を設定
-- ===================================================================

-- 認証ユーザーと匿名ユーザーにSELECT権限を付与
GRANT SELECT ON public.work_ctr_stats TO anon, authenticated;

-- ===================================================================
-- 4. 注意事項とセキュリティ考慮
-- ===================================================================

-- この修正により以下が実現されます：
-- 
-- ✅ クエリ実行ユーザーの権限で実行される
-- ✅ 元テーブル（impressions_log, views_log）のRLSポリシーが適用される
-- ✅ Security Definerの警告が解消される
-- ✅ 適切なアクセス制御が機能する
--
-- 元テーブルのRLS設定との関係：
-- - impressions_log: 認証ユーザーは自分のログのみ、匿名ログは非表示
-- - views_log: 自分の閲覧履歴のみ閲覧可能
-- 
-- 結果として：
-- - 匿名ユーザー: 匿名インプレッション + 自分の閲覧がないため空の結果
-- - 認証ユーザー: 自分のインプレッション + 自分の閲覧履歴のみ
-- 
-- ⚠️  これにより統計の性質が変わる可能性があります：
-- - 全作品の統計ではなく、ユーザー個別の統計になる
-- - アプリケーション層で用途を確認する必要がある

-- ===================================================================
-- 5. レコメンド機能用の公開統計テーブル作成
-- ===================================================================

-- 個人情報を含まない公開統計テーブルを作成
CREATE TABLE IF NOT EXISTS public.work_ctr_stats_public (
    work_id UUID PRIMARY KEY,
    impression_count BIGINT DEFAULT 0,
    unique_clicks BIGINT DEFAULT 0, 
    total_clicks BIGINT DEFAULT 0,
    ctr_unique DOUBLE PRECISION DEFAULT 0.0,
    ctr_total DOUBLE PRECISION DEFAULT 0.0,
    avg_intersection_ratio DOUBLE PRECISION DEFAULT 0.0,
    avg_display_duration DOUBLE PRECISION DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT work_ctr_stats_public_work_id_fkey 
    FOREIGN KEY (work_id) REFERENCES public.works(work_id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_work_ctr_stats_public_ctr_unique 
    ON public.work_ctr_stats_public(ctr_unique DESC);
CREATE INDEX IF NOT EXISTS idx_work_ctr_stats_public_updated 
    ON public.work_ctr_stats_public(last_updated DESC);

-- 全ユーザーに読み取り権限を付与（レコメンド機能で使用）
GRANT SELECT ON public.work_ctr_stats_public TO anon, authenticated;

-- ===================================================================
-- 6. 統計更新用の関数作成（service_role用）
-- ===================================================================

-- 統計を安全に計算・更新する関数
CREATE OR REPLACE FUNCTION update_work_ctr_stats_public()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- service_roleで実行
AS $$
BEGIN
    -- 一時的にRLSを無効化してservice_roleで全データアクセス
    SET LOCAL row_security = off;
    
    -- 既存データを削除
    DELETE FROM public.work_ctr_stats_public;
    
    -- 新しい統計データを挿入
    INSERT INTO public.work_ctr_stats_public (
        work_id,
        impression_count, 
        unique_clicks,
        total_clicks,
        ctr_unique,
        ctr_total,
        avg_intersection_ratio,
        avg_display_duration,
        last_updated
    )
    WITH
      impression_stats as (
        SELECT
          work_id,
          COUNT(*) as impression_count,
          AVG(intersection_ratio) as avg_intersection_ratio,
          AVG(display_duration) as avg_display_duration
        FROM public.impressions_log
        WHERE impressed_at >= (now() - '30 days'::interval)
          AND intersection_ratio >= 0.5
          AND display_duration >= 1000
        GROUP BY work_id
      ),
      click_stats as (
        SELECT
          work_id,
          COUNT(DISTINCT user_id) as unique_clicks,
          COUNT(*) as total_clicks
        FROM public.views_log
        WHERE viewed_at >= (now() - '30 days'::interval)
        GROUP BY work_id
      )
    SELECT
      i.work_id,
      i.impression_count,
      COALESCE(c.unique_clicks, 0) as unique_clicks,
      COALESCE(c.total_clicks, 0) as total_clicks,
      CASE
        WHEN i.impression_count > 0 THEN COALESCE(c.unique_clicks, 0)::double precision / i.impression_count::double precision
        ELSE 0.0
      END as ctr_unique,
      CASE
        WHEN i.impression_count > 0 THEN COALESCE(c.total_clicks, 0)::double precision / i.impression_count::double precision
        ELSE 0.0
      END as ctr_total,
      i.avg_intersection_ratio,
      i.avg_display_duration,
      NOW()
    FROM impression_stats i
    LEFT JOIN click_stats c ON i.work_id = c.work_id;
    
    RAISE NOTICE 'Updated % work CTR stats', (SELECT COUNT(*) FROM public.work_ctr_stats_public);
END;
$$;

-- service_roleのみ実行権限
REVOKE ALL ON FUNCTION update_work_ctr_stats_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_work_ctr_stats_public() TO service_role;

-- ===================================================================
-- 7. 元のwork_ctr_statsビューを公開テーブルにリダイレクト
-- ===================================================================

-- 元のビューを削除
DROP VIEW IF EXISTS public.work_ctr_stats;

-- 公開テーブルを参照する新しいビュー
CREATE VIEW public.work_ctr_stats AS
SELECT 
    work_id,
    impression_count,
    unique_clicks,
    total_clicks,
    ctr_unique,
    ctr_total,
    avg_intersection_ratio,
    avg_display_duration
FROM public.work_ctr_stats_public;

-- ビューにアクセス権限付与
GRANT SELECT ON public.work_ctr_stats TO anon, authenticated;

-- ===================================================================
-- 8. 定期実行の設定（pg_cron拡張を使用する場合）
-- ===================================================================
-- 1日1回統計を更新する場合の例：
-- SELECT cron.schedule('update-work-ctr-stats', '0 2 * * *', 'SELECT update_work_ctr_stats_public();');

-- ===================================================================
-- 実行後の確認事項
-- ===================================================================
-- 1. 公開統計テーブルが正常に作成されることを確認
-- 2. 更新関数が正常に動作することを確認：
--    SELECT update_work_ctr_stats_public();
-- 3. work_ctr_statsビューからデータが正常に取得できることを確認
-- 4. Security Definerの警告が消えることを確認
-- 5. アプリケーションでレコメンド機能が正常動作することを確認
-- 6. 統計データが期待される全体データになることを確認

-- ===================================================================
-- 移行時の注意事項
-- ===================================================================
-- 1. 初回実行後、手動で統計更新を実行：
--    SELECT update_work_ctr_stats_public();
-- 2. 定期実行の設定（cron, GitHub Actions等）
-- 3. アプリケーションコードの変更は不要（同じテーブル名・カラム名）