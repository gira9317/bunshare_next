-- scheduled_atデータを日本時間からUTC時間に変換

-- 1. 現在の状況を確認（全て+09で保存されている）
SELECT 
  work_id,
  title,
  scheduled_at,
  pg_typeof(scheduled_at) as type
FROM works 
WHERE scheduled_at IS NOT NULL
ORDER BY scheduled_at DESC
LIMIT 5;

-- 2. scheduled_atを9時間前（UTC時間）に修正
-- 2025-09-05 05:47:00+09 → 2025-09-04 20:47:00+00
UPDATE works 
SET scheduled_at = scheduled_at - INTERVAL '9 hours'
WHERE scheduled_at IS NOT NULL;

-- 3. 修正後の確認
SELECT 
  work_id,
  title,
  scheduled_at as utc_time,
  scheduled_at AT TIME ZONE 'Asia/Tokyo' as jst_display
FROM works 
WHERE scheduled_at IS NOT NULL
ORDER BY scheduled_at DESC
LIMIT 5;