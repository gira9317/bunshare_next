-- 1. worksテーブルに関連するすべてのトリガーを確認
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'works';

-- 2. is_publishedやscheduled_atに関連する関数を確認
SELECT 
  proname as function_name,
  proargnames as arguments,
  prosrc as source_code
FROM pg_proc
WHERE prosrc LIKE '%is_published%'
   OR prosrc LIKE '%scheduled_at%'
   OR proname LIKE '%publish%';

-- 3. cronジョブの確認（pg_cronが有効な場合）
SELECT * FROM cron.job WHERE command LIKE '%publish%';

-- 4. RLS（Row Level Security）ポリシーの確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'works';

-- 5. worksテーブルの制約を確認
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  consrc as source
FROM pg_constraint
WHERE conrelid = 'works'::regclass;

-- 6. 最近更新された作品を確認（何かが自動的に更新している可能性）
SELECT 
  work_id,
  title,
  is_published,
  scheduled_at,
  created_at,
  updated_at
FROM works
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 10;