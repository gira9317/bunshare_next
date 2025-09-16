-- ========================================
-- デバッグ用クエリ集
-- Date: 2025-01-16
-- Description: いいね機能のデバッグ用クエリ
-- ========================================

-- 1. デバッグログを確認（最新20件）
SELECT 
  id,
  function_name,
  log_message,
  log_data,
  created_at
FROM debug_logs 
WHERE function_name = 'update_work_likes_count'
ORDER BY created_at DESC 
LIMIT 20;

-- 2. likesテーブルの最新データを確認
SELECT 
  l.id,
  l.user_id,
  l.work_id,
  l.liked_at,
  w.title as work_title,
  w.likes as work_likes_count,
  w.likes_count as work_likes_count_old,
  u.username
FROM likes l
LEFT JOIN works w ON l.work_id = w.work_id
LEFT JOIN users u ON l.user_id = u.id
ORDER BY l.liked_at DESC
LIMIT 10;

-- 3. worksテーブルのlikes関連カラムの状態を確認
SELECT 
  work_id,
  title,
  likes,
  likes_count,
  stats_last_updated,
  CASE 
    WHEN likes IS NULL THEN 'likes is NULL'
    WHEN likes_count IS NULL THEN 'likes_count is NULL'
    WHEN likes != likes_count THEN 'Mismatch!'
    ELSE 'OK'
  END as status
FROM works
WHERE likes IS NOT NULL OR likes_count IS NOT NULL
ORDER BY stats_last_updated DESC
LIMIT 20;

-- 4. トリガーの存在確認
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'likes'
  AND trigger_schema = 'public';

-- 5. 関数の存在確認
SELECT 
  proname as function_name,
  pronargs as arg_count,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'update_work_likes_count'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. RLSポリシーの確認
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
WHERE tablename = 'likes';

-- 7. 現在のユーザー権限を確認
SELECT 
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('likes', 'works')
  AND grantee = current_user;

-- 8. likesテーブルとworksテーブルの実際のカウントを比較
WITH like_counts AS (
  SELECT 
    work_id,
    COUNT(*) as actual_count
  FROM likes
  GROUP BY work_id
)
SELECT 
  w.work_id,
  w.title,
  w.likes as stored_likes,
  w.likes_count as stored_likes_count,
  COALESCE(lc.actual_count, 0) as actual_like_count,
  CASE 
    WHEN w.likes = COALESCE(lc.actual_count, 0) THEN '✓ likes matches'
    ELSE '✗ likes mismatch'
  END as likes_status,
  CASE 
    WHEN w.likes_count = COALESCE(lc.actual_count, 0) THEN '✓ likes_count matches'
    ELSE '✗ likes_count mismatch'
  END as likes_count_status
FROM works w
LEFT JOIN like_counts lc ON w.work_id = lc.work_id
WHERE w.likes IS NOT NULL OR w.likes_count IS NOT NULL OR lc.actual_count IS NOT NULL
ORDER BY w.created_at DESC
LIMIT 20;

-- 9. 手動テスト用: 特定の作品のいいね状態を確認
-- work_idを実際の値に置き換えて実行
/*
SELECT 
  'Work Info' as category,
  work_id,
  title,
  likes,
  likes_count,
  stats_last_updated
FROM works
WHERE work_id = 'YOUR_WORK_ID_HERE'

UNION ALL

SELECT 
  'Like Records' as category,
  l.id::text as work_id,
  u.username as title,
  NULL as likes,
  NULL as likes_count,
  l.liked_at as stats_last_updated
FROM likes l
JOIN users u ON l.user_id = u.id
WHERE l.work_id = 'YOUR_WORK_ID_HERE';
*/

-- 10. デバッグログをクリア（必要に応じて）
-- DELETE FROM debug_logs WHERE function_name = 'update_work_likes_count';