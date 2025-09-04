-- 既存のscheduled_atデータを正しく修正
-- 既存データは実際にはUTC時間として保存されていたが、
-- 日本時間として解釈されて変換されてしまった

-- 1. 現在の状況を確認
SELECT 
  work_id,
  title,
  scheduled_at,
  scheduled_at AT TIME ZONE 'UTC' as should_be_utc
FROM works 
WHERE scheduled_at IS NOT NULL
LIMIT 5;

-- 2. scheduled_atを正しいUTC時間に修正
-- 現在 2025-09-04 21:48:00+09 → 2025-09-04 12:48:00+00 に修正
UPDATE works 
SET scheduled_at = (scheduled_at AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'UTC'
WHERE scheduled_at IS NOT NULL;

-- 3. 修正後の確認
SELECT 
  work_id,
  title,
  scheduled_at,
  scheduled_at AT TIME ZONE 'Asia/Tokyo' as jst_time
FROM works 
WHERE scheduled_at IS NOT NULL
LIMIT 5;