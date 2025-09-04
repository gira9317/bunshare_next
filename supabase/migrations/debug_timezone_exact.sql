-- 1. 時刻の詳細比較
SELECT 
  '=== TIMEZONE DEBUG ===' as debug,
  NOW() as now_jst,
  CURRENT_TIMESTAMP as current_timestamp,
  CURRENT_TIMESTAMP AT TIME ZONE 'UTC' as current_utc,
  timezone('UTC', NOW()) as timezone_utc,
  extract(epoch from NOW()) as now_epoch,
  extract(epoch from CURRENT_TIMESTAMP AT TIME ZONE 'UTC') as utc_epoch;

-- 2. 問題の作品を特定して詳細確認
SELECT 
  work_id,
  title,
  is_published,
  scheduled_at,
  scheduled_at AT TIME ZONE 'UTC' as scheduled_utc_explicit,
  NOW() as now_jst,
  CURRENT_TIMESTAMP AT TIME ZONE 'UTC' as current_utc,
  
  -- 各種比較
  scheduled_at <= NOW() as compare_with_now,
  scheduled_at <= CURRENT_TIMESTAMP as compare_with_current,
  scheduled_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') as compare_with_utc,
  
  -- 時間差（分）
  EXTRACT(EPOCH FROM (scheduled_at - NOW()))/60 as diff_now_minutes,
  EXTRACT(EPOCH FROM (scheduled_at - (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')))/60 as diff_utc_minutes,
  
  -- scheduled_atのタイムゾーン情報
  pg_typeof(scheduled_at) as scheduled_at_type
FROM works
WHERE scheduled_at IS NOT NULL
  AND is_published = false
ORDER BY scheduled_at DESC
LIMIT 5;

-- 3. タイムゾーン設定確認
SHOW timezone;
SELECT current_setting('timezone');

-- 4. scheduled_atフィールドの実際の値とタイプを確認
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'works' 
  AND column_name IN ('scheduled_at', 'created_at', 'updated_at');