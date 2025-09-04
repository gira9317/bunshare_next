-- pg_cronエクステンションを有効化（Supabaseダッシュボードで有効化が必要な場合があります）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のスケジュールがあれば削除
SELECT cron.unschedule('auto-publish-works') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-publish-works'
);

-- 毎分実行するcronジョブを作成
SELECT cron.schedule(
  'auto-publish-works',           -- ジョブ名
  '* * * * *',                    -- 毎分実行
  'SELECT public.auto_publish_scheduled_works();'
);

-- cronジョブの一覧を確認（デバッグ用）
SELECT * FROM cron.job;