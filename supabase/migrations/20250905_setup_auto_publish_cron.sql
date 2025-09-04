-- pg_cronエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存の同名cronジョブがあれば削除
SELECT cron.unschedule('auto-publish-scheduled-works') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-publish-scheduled-works'
);

-- 毎分実行するcronジョブを作成
SELECT cron.schedule(
  'auto-publish-scheduled-works',                    -- ジョブ名
  '* * * * *',                                       -- 毎分実行
  'SELECT public.auto_publish_scheduled_works();'    -- 実行する関数
);

-- cronジョブの一覧を確認
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'auto-publish-scheduled-works';

-- テスト用：手動で関数を実行してみる
SELECT public.auto_publish_scheduled_works();

-- 現在の予約投稿一覧を確認
SELECT 
  work_id,
  title,
  is_published,
  scheduled_at,
  scheduled_at <= NOW() as should_be_published,
  NOW() as current_time
FROM works
WHERE scheduled_at IS NOT NULL
ORDER BY scheduled_at DESC
LIMIT 10;