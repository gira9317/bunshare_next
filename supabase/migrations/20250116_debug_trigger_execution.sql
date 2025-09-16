-- ========================================
-- トリガーの実行状況を詳しく調査
-- Date: 2025-01-16
-- Description: なぜworks.likesが更新されないかを特定
-- ========================================

-- 1. トリガーが正しく設定されているか確認
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_timing,
    t.action_statement,
    t.action_condition
FROM information_schema.triggers t
WHERE t.event_object_table = 'likes'
    AND t.trigger_schema = 'public'
ORDER BY t.trigger_name;

-- 2. update_work_likes_count関数が存在するか確認
SELECT 
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'update_work_likes_count'
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. 手動でトリガー関数を実行してテスト
-- まず、テスト用のレコードを確認
SELECT 
    work_id,
    title,
    likes,
    likes_count,
    stats_last_updated
FROM works
WHERE work_id = '51de0644-7aa3-42c7-ba05-9b6e56032995';

-- 4. 手動でいいねを追加してトリガーの動作を確認
-- デバッグログをクリア
DELETE FROM debug_logs WHERE function_name = 'update_work_likes_count';

-- 実際のuser_idに置き換えて実行
-- INSERT INTO likes (work_id, user_id) VALUES ('51de0644-7aa3-42c7-ba05-9b6e56032995', 'YOUR_USER_ID');

-- 5. トリガーが実行されたかデバッグログで確認
SELECT 
    id,
    log_message,
    log_data,
    created_at
FROM debug_logs
WHERE function_name = 'update_work_likes_count'
ORDER BY created_at DESC;

-- 6. worksテーブルが更新されたか確認
SELECT 
    work_id,
    title,
    likes,
    likes_count,
    stats_last_updated
FROM works
WHERE work_id = '51de0644-7aa3-42c7-ba05-9b6e56032995';

-- 7. トリガーが無効になっていないか確認
SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled,
    tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgrelid = 'likes'::regclass
    AND tgname LIKE '%update_work_likes%';

-- 8. worksテーブルのRLSポリシーを確認
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
WHERE tablename = 'works'
ORDER BY policyname;

-- 9. 現在のユーザーがworksテーブルを更新できるか確認
SELECT 
    table_name,
    privilege_type,
    grantee,
    grantor
FROM information_schema.table_privileges
WHERE table_name = 'works'
    AND grantee = current_user;

-- 10. 手動でworks.likesを更新してみる（権限テスト）
-- UPDATE works SET likes = likes + 1 WHERE work_id = '51de0644-7aa3-42c7-ba05-9b6e56032995';

-- 11. エラーログがあるか確認（PostgreSQLログ）
-- これはSupabaseダッシュボードのLogsセクションで確認

-- 12. トリガーを手動で無効化/有効化してテスト
-- ALTER TABLE likes DISABLE TRIGGER trigger_update_work_likes_insert;
-- ALTER TABLE likes ENABLE TRIGGER trigger_update_work_likes_insert;

-- 13. より詳細なデバッグのため、トリガー関数にさらにログを追加
CREATE OR REPLACE FUNCTION public.log_trigger_debug(
    p_message TEXT,
    p_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.debug_logs (function_name, log_message, log_data)
    VALUES ('trigger_debug', p_message, p_data);
    
    -- PostgreSQLログにも出力
    RAISE NOTICE 'TRIGGER DEBUG: % - %', p_message, p_data;
END;
$$ LANGUAGE plpgsql;