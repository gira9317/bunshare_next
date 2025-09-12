-- Supabase Cron Jobs設定

-- pg_cron拡張を有効化（Supabaseで自動有効化済み）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のCronジョブをクリーンアップ（存在する場合のみ）
DO $$
BEGIN
  -- 存在チェック後に削除
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-recommendations-morning') THEN
    PERFORM cron.unschedule('refresh-recommendations-morning');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-recommendations-evening') THEN
    PERFORM cron.unschedule('refresh-recommendations-evening');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-logs') THEN
    PERFORM cron.unschedule('cleanup-old-logs');
  END IF;
END $$;

-- 推薦キャッシュ更新ジョブをスケジュール
DO $$
BEGIN
  -- 朝6時の推薦キャッシュ更新
  BEGIN
    PERFORM cron.schedule(
      'refresh-recommendations-morning',
      '0 6 * * *',  -- 毎日朝6時（UTC）
      'SELECT cron_refresh_recommendations();'
    );
    RAISE NOTICE 'Cronジョブ "refresh-recommendations-morning" をスケジュールしました';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Morning cron job scheduling failed: %', SQLERRM;
  END;

  -- 夕方6時の推薦キャッシュ更新
  BEGIN
    PERFORM cron.schedule(
      'refresh-recommendations-evening', 
      '0 18 * * *',  -- 毎日夕方6時（UTC）
      'SELECT cron_refresh_recommendations();'
    );
    RAISE NOTICE 'Cronジョブ "refresh-recommendations-evening" をスケジュールしました';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Evening cron job scheduling failed: %', SQLERRM;
  END;

  -- 古いログクリーンアップ（毎週日曜日 午前3時）
  BEGIN
    PERFORM cron.schedule(
      'cleanup-old-logs',
      '0 3 * * 0',  -- 毎週日曜日午前3時
      'SELECT cleanup_old_cron_logs();'
    );
    RAISE NOTICE 'Cronジョブ "cleanup-old-logs" をスケジュールしました';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Cleanup cron job scheduling failed: %', SQLERRM;
  END;
END $$;

-- Cronジョブ確認（セットアップ完了確認用）
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Cronジョブセットアップ完了 ===';
  RAISE NOTICE 'スケジュールされたジョブ数: %', (SELECT COUNT(*) FROM cron.job);
  
  -- 各ジョブの詳細を表示
  FOR rec IN SELECT jobname, schedule, command FROM cron.job ORDER BY jobname LOOP
    RAISE NOTICE 'ジョブ: % | スケジュール: % | コマンド: %', rec.jobname, rec.schedule, rec.command;
  END LOOP;
END $$;

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

-- 初回実行（セットアップ時に推薦キャッシュを構築）
DO $$
DECLARE
  result JSON;
BEGIN
  -- 手動で推薦キャッシュを初期構築
  BEGIN
    SELECT manual_refresh_recommendations() INTO result;
    RAISE NOTICE '初回推薦キャッシュ構築完了: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '初回推薦キャッシュ構築失敗: %', SQLERRM;
      RAISE NOTICE '推薦システムは次回のCron実行時に初期化されます';
  END;
END $$;