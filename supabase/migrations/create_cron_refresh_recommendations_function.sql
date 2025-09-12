-- Supabase Cron用推薦キャッシュ更新関数
CREATE OR REPLACE FUNCTION cron_refresh_recommendations()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  error_message TEXT;
BEGIN
  start_time := NOW();
  
  -- ログ出力
  RAISE NOTICE '🔄 [CRON] 推薦キャッシュ更新開始: %', start_time;
  
  BEGIN
    -- マテリアライズドビューを並行更新
    RAISE NOTICE '📊 [CRON] ユーザー嗜好キャッシュ更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_preferences_cache;
    
    RAISE NOTICE '🔥 [CRON] 人気作品スナップショット更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_works_snapshot;
    
    RAISE NOTICE '👥 [CRON] ユーザー類似度マトリックス更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity_matrix;
    
    -- 期限切れ推薦キャッシュを削除
    RAISE NOTICE '🗑️ [CRON] 期限切れキャッシュクリーンアップ中...';
    DELETE FROM recommendation_cache WHERE expires_at <= NOW();
    
    -- 統計情報を更新
    ANALYZE user_preferences_cache;
    ANALYZE popular_works_snapshot;
    ANALYZE user_similarity_matrix;
    ANALYZE recommendation_cache;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RAISE NOTICE '✅ [CRON] 推薦キャッシュ更新完了: % (実行時間: %ms)', end_time, duration_ms;
    
    -- 成功ログをテーブルに保存
    INSERT INTO cron_execution_logs (
      job_name,
      status,
      start_time,
      end_time,
      duration_ms,
      message
    ) VALUES (
      'refresh_recommendations',
      'success',
      start_time,
      end_time,
      duration_ms,
      FORMAT('推薦キャッシュ更新成功 - 実行時間: %sms', duration_ms)
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      error_message := SQLERRM;
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      RAISE WARNING '❌ [CRON] 推薦キャッシュ更新エラー: %', error_message;
      
      -- エラーログをテーブルに保存
      INSERT INTO cron_execution_logs (
        job_name,
        status,
        start_time,
        end_time,
        duration_ms,
        message,
        error_details
      ) VALUES (
        'refresh_recommendations',
        'error',
        start_time,
        end_time,
        duration_ms,
        FORMAT('推薦キャッシュ更新失敗 - 実行時間: %sms', duration_ms),
        error_message
      );
      
      -- エラーを再発生させる
      RAISE;
  END;
END;
$$;

-- Cron実行ログテーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  message TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_cron_execution_logs_job_name 
ON cron_execution_logs (job_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_execution_logs_status 
ON cron_execution_logs (status, created_at DESC);

-- 古いログの自動削除（30日以上）
CREATE OR REPLACE FUNCTION cleanup_old_cron_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM cron_execution_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE '🗑️ [CLEANUP] 古いCronログを削除しました';
END;
$$;

-- Cron統計情報取得関数
CREATE OR REPLACE FUNCTION get_cron_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_executions', (
      SELECT COUNT(*) FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations'
    ),
    'success_count', (
      SELECT COUNT(*) FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations' AND status = 'success'
    ),
    'error_count', (
      SELECT COUNT(*) FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations' AND status = 'error'
    ),
    'last_execution', (
      SELECT json_build_object(
        'start_time', start_time,
        'end_time', end_time,
        'duration_ms', duration_ms,
        'status', status,
        'message', message
      )
      FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations'
      ORDER BY created_at DESC 
      LIMIT 1
    ),
    'avg_duration_ms', (
      SELECT COALESCE(ROUND(AVG(duration_ms)), 0)
      FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations' 
        AND status = 'success'
        AND created_at > NOW() - INTERVAL '7 days'
    ),
    'recent_executions', (
      SELECT json_agg(
        json_build_object(
          'start_time', start_time,
          'status', status,
          'duration_ms', duration_ms,
          'message', message
        ) ORDER BY created_at DESC
      )
      FROM (
        SELECT start_time, status, duration_ms, message, created_at
        FROM cron_execution_logs 
        WHERE job_name = 'refresh_recommendations'
        ORDER BY created_at DESC 
        LIMIT 10
      ) recent
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$;

-- 手動実行用関数（テスト用）
CREATE OR REPLACE FUNCTION manual_refresh_recommendations()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
BEGIN
  start_time := NOW();
  
  -- 推薦キャッシュ更新を実行
  PERFORM cron_refresh_recommendations();
  
  end_time := NOW();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  -- 統計情報と実行結果を返す
  SELECT json_build_object(
    'success', true,
    'message', '推薦キャッシュが手動更新されました',
    'execution_time', duration_ms || 'ms',
    'start_time', start_time,
    'end_time', end_time,
    'stats', get_recommendation_stats(),
    'cron_stats', get_cron_stats()
  ) INTO result;
  
  RETURN result;
END;
$$;