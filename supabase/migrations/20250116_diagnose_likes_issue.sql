-- ========================================
-- いいね追加が削除になる問題の診断
-- Date: 2025-01-16
-- ========================================

-- 1. 特定の作品のいいね状態を詳しく確認
-- work_id: '51de0644-7aa3-42c7-ba05-9b6e56032995' を例として使用

-- いいねレコードの詳細を確認
SELECT 
  l.id,
  l.user_id,
  l.work_id,
  l.liked_at,
  l.updated_at,
  u.username,
  w.title
FROM likes l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN works w ON l.work_id = w.work_id
WHERE l.work_id = '51de0644-7aa3-42c7-ba05-9b6e56032995'
ORDER BY l.liked_at DESC;

-- 2. Server Actionsのロジックを再現
-- toggleLikeActionは以下の流れで動作：
-- 1. 既存のいいねを確認（SELECT）
-- 2. 存在する場合 → DELETE
-- 3. 存在しない場合 → INSERT

-- 問題の可能性：
-- A. フロントエンドが「いいね済み」と誤認識している
-- B. データベースに古いいいねレコードが残っている
-- C. user_idの不一致

-- 3. 現在ログインしているユーザーのいいね一覧を確認
-- ※実際のuser_idに置き換えて実行
/*
SELECT 
  l.work_id,
  w.title,
  l.liked_at
FROM likes l
JOIN works w ON l.work_id = w.work_id
WHERE l.user_id = 'YOUR_USER_ID'
ORDER BY l.liked_at DESC
LIMIT 20;
*/

-- 4. 重複レコードのチェック
SELECT 
  work_id,
  user_id,
  COUNT(*) as duplicate_count
FROM likes
GROUP BY work_id, user_id
HAVING COUNT(*) > 1;

-- 5. likesテーブルの制約を確認
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'likes'::regclass;

-- 6. 最近のデバッグログから、同じwork_idのINSERTとDELETEを確認
SELECT 
  id,
  log_message,
  log_data->>'TG_OP' as operation,
  log_data->>'work_id' as work_id,
  log_data->>'user_id' as user_id,
  created_at
FROM debug_logs
WHERE function_name = 'update_work_likes_count'
  AND log_data->>'work_id' = '51de0644-7aa3-42c7-ba05-9b6e56032995'
ORDER BY created_at DESC
LIMIT 20;

-- 7. フロントエンドの状態とデータベースの状態の不一致を確認
-- worksテーブルのlikes数と実際のlikesレコード数を比較
WITH actual_likes AS (
  SELECT 
    work_id,
    COUNT(*) as real_count
  FROM likes
  WHERE work_id = '51de0644-7aa3-42c7-ba05-9b6e56032995'
  GROUP BY work_id
)
SELECT 
  w.work_id,
  w.title,
  w.likes as stored_likes,
  COALESCE(al.real_count, 0) as actual_like_records,
  CASE 
    WHEN w.likes = COALESCE(al.real_count, 0) THEN '✓ 一致'
    ELSE '✗ 不一致！'
  END as status
FROM works w
LEFT JOIN actual_likes al ON w.work_id = al.work_id
WHERE w.work_id = '51de0644-7aa3-42c7-ba05-9b6e56032995';

-- 8. Server Actionsのエラーログを確認するため、
-- フロントエンドのコンソールログも確認してください：
-- - 'Select error:' 
-- - 'Insert error:'
-- - 'Delete error:'