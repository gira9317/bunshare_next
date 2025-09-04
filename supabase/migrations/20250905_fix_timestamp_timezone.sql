-- scheduled_atカラムをtimestamp with time zoneに変更
-- これにより、タイムゾーン情報が正しく保存・比較される

-- 1. 既存データのバックアップとして、現在の値を確認
SELECT 
  work_id,
  title,
  scheduled_at,
  pg_typeof(scheduled_at) as current_type
FROM works 
WHERE scheduled_at IS NOT NULL
LIMIT 5;

-- 2. 依存するビューを一時的に削除
DROP VIEW IF EXISTS public.works_published;

-- 3. カラム型を変更
-- without timezoneからwith timezoneに変更する時は、
-- 既存データがどのタイムゾーンで保存されているかを明示する必要がある
ALTER TABLE works 
ALTER COLUMN scheduled_at TYPE timestamp with time zone 
USING scheduled_at AT TIME ZONE 'UTC';

-- 3. created_atとupdated_atも同様に変更（念のため）
ALTER TABLE works 
ALTER COLUMN created_at TYPE timestamp with time zone 
USING created_at AT TIME ZONE 'UTC';

ALTER TABLE works 
ALTER COLUMN updated_at TYPE timestamp with time zone 
USING updated_at AT TIME ZONE 'UTC';

-- 5. ビューを再作成（修正版）
CREATE OR REPLACE VIEW public.works_published AS
SELECT 
  *,
  CASE 
    WHEN is_published = true THEN true
    WHEN scheduled_at IS NOT NULL AND scheduled_at <= NOW() THEN true
    ELSE false
  END AS is_actually_published
FROM public.works;

-- 権限設定
GRANT SELECT ON public.works_published TO authenticated;
GRANT SELECT ON public.works_published TO anon;

-- 6. 変更後の確認
SELECT 
  work_id,
  title,
  scheduled_at,
  pg_typeof(scheduled_at) as new_type,
  scheduled_at AT TIME ZONE 'Asia/Tokyo' as scheduled_jst,
  NOW() as current_time,
  scheduled_at <= NOW() as should_be_published
FROM works 
WHERE scheduled_at IS NOT NULL
LIMIT 5;