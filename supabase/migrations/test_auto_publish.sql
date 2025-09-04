-- 現在のUTC時刻を確認
SELECT 
  NOW() as current_utc_time,
  NOW() AT TIME ZONE 'Asia/Tokyo' as current_jst_time;

-- 予約投稿待ちの作品を詳細確認
SELECT 
  work_id,
  title,
  is_published,
  scheduled_at,
  scheduled_at AT TIME ZONE 'Asia/Tokyo' as scheduled_jst,
  NOW() as current_utc,
  NOW() AT TIME ZONE 'Asia/Tokyo' as current_jst,
  scheduled_at <= NOW() as should_be_published,
  EXTRACT(EPOCH FROM (scheduled_at - NOW()))/60 as minutes_until_publish
FROM works
WHERE is_published = false
  AND scheduled_at IS NOT NULL;

-- 手動で自動公開関数を実行
SELECT public.auto_publish_scheduled_works();

-- 結果を確認
SELECT 
  work_id,
  title,
  is_published,
  scheduled_at,
  updated_at
FROM works
WHERE scheduled_at IS NOT NULL
ORDER BY scheduled_at DESC
LIMIT 10;