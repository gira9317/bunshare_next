-- pg_cronエクステンションを確認・有効化
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- もしpg_cronが無効の場合は有効化（権限が必要）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のcronジョブを削除
SELECT cron.unschedule('auto-publish-scheduled-works');

-- 毎分実行するcronジョブを作成
SELECT cron.schedule(
  'auto-publish-scheduled-works',
  '* * * * *',
  'SELECT public.auto_publish_scheduled_works();'
);

-- cronジョブが正常に作成されたか確認
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'auto-publish-scheduled-works';

-- 現在の予約投稿状況を確認
SELECT 
  work_id,
  title,
  is_published,
  scheduled_at,
  scheduled_at <= NOW() as should_be_published
FROM works
WHERE scheduled_at IS NOT NULL
  AND is_published = false
ORDER BY scheduled_at ASC;