-- Edge Function用の15分間隔cron設定
-- この設定をSupabase DashboardのDatabase > Extensions > pg_cronで実行

-- 既存のcronジョブを削除（同じ名前があれば）
SELECT cron.unschedule('process-embeddings-v2-auto');

-- 15分間隔で埋め込み処理を実行
SELECT cron.schedule(
  'process-embeddings-v2-auto',
  '*/15 * * * *',  -- 15分おき
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/process-embeddings-v2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'batch_size', 20,
      'max_cost_usd', 10.0,
      'force_reprocess', false
    )
  );
  $$
);

-- cronジョブの状態確認
SELECT * FROM cron.job WHERE jobname = 'process-embeddings-v2-auto';