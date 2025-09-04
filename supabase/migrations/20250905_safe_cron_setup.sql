-- pg_cronエクステンションの状態を確認
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 既存のcronジョブがある場合のみ削除
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-publish-scheduled-works') THEN
        PERFORM cron.unschedule('auto-publish-scheduled-works');
        RAISE NOTICE 'Existing cron job removed';
    ELSE
        RAISE NOTICE 'No existing cron job found';
    END IF;
END $$;

-- 毎分実行するcronジョブを作成
SELECT cron.schedule(
    'auto-publish-scheduled-works',
    '* * * * *',
    'SELECT public.auto_publish_scheduled_works();'
);

-- cronジョブの確認
SELECT 
    jobid,
    schedule,
    command,
    active,
    jobname,
    database
FROM cron.job 
WHERE jobname = 'auto-publish-scheduled-works';

-- 現在時刻の確認
SELECT NOW() as current_time;

-- 予約投稿待ちの作品を確認
SELECT 
    work_id,
    title,
    is_published,
    scheduled_at,
    scheduled_at <= NOW() as should_be_published,
    EXTRACT(EPOCH FROM (scheduled_at - NOW()))/60 as minutes_until_publish
FROM works
WHERE scheduled_at IS NOT NULL
    AND is_published = false
ORDER BY scheduled_at ASC
LIMIT 10;