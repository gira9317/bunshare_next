-- プライベートスキーマ作成とマテリアライズドビューの移動

-- 1. プライベートスキーマ作成
CREATE SCHEMA IF NOT EXISTS _internal;

-- 2. スキーマへのアクセス権限設定
-- public からのアクセスを制限
REVOKE ALL ON SCHEMA _internal FROM public;
REVOKE ALL ON SCHEMA _internal FROM anon;

-- サービスロールとpostgresのみアクセス可能（Edge Functions専用）
GRANT USAGE ON SCHEMA _internal TO service_role;
GRANT ALL ON SCHEMA _internal TO postgres;

-- 3. 既存のマテリアライズドビューをプライベートスキーマに移動
ALTER MATERIALIZED VIEW IF EXISTS public.popular_works_snapshot SET SCHEMA _internal;
ALTER MATERIALIZED VIEW IF EXISTS public.user_preferences_cache SET SCHEMA _internal;
ALTER MATERIALIZED VIEW IF EXISTS public.user_similarity_matrix SET SCHEMA _internal;

-- 4. 移動後の権限設定
-- サービスロール（Edge Functions用）には全権限
GRANT ALL ON _internal.popular_works_snapshot TO service_role;
GRANT ALL ON _internal.user_preferences_cache TO service_role;
GRANT ALL ON _internal.user_similarity_matrix TO service_role;

-- 5. マテリアライズドビューにはRLSを設定できないため、アクセス制御は権限のみで実施
-- Edge Functions (service_role) のみがアクセス可能で、
-- 通常の認証ユーザーからは直接アクセスできないように設定済み

-- 注: マテリアライズドビューはRLSをサポートしないため、
-- データへのアクセス制御はスキーマレベルの権限管理で実施
-- _internal スキーマへのアクセスは service_role のみに制限

-- 6. サービスロールはRLSをバイパス可能（Edge Functions用）
-- （デフォルトでservice_roleはRLSをバイパスする権限を持っている）

-- 7. 統計情報更新（パフォーマンス維持）
ANALYZE _internal.popular_works_snapshot;
ANALYZE _internal.user_preferences_cache;
ANALYZE _internal.user_similarity_matrix;

-- 8. 移動確認用のビュー（開発時のみ、本番では削除推奨）
COMMENT ON SCHEMA _internal IS 'Private schema for internal recommendation data - not accessible via public API';

-- 9. 定期更新関数の修正（既存のものがあれば）
-- refresh_recommendation_cache関数を_internalスキーマに対応させる
CREATE OR REPLACE FUNCTION refresh_recommendation_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Edge Functionsからの実行のため
AS $$
BEGIN
  -- マテリアライズドビューを並行更新（_internalスキーマ版）
  REFRESH MATERIALIZED VIEW CONCURRENTLY _internal.user_preferences_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY _internal.popular_works_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY _internal.user_similarity_matrix;
  
  -- 期限切れ推薦キャッシュを削除（もしあれば）
  DELETE FROM recommendation_cache WHERE expires_at <= NOW();
  
  RAISE NOTICE '_internal スキーマの推薦キャッシュ更新が完了しました';
END;
$$;

-- サービスロールに実行権限付与
GRANT EXECUTE ON FUNCTION refresh_recommendation_cache() TO service_role;