-- ========================================
-- トリガーとトリガー関数の詳細確認
-- Date: 2025-01-16
-- Description: trigger_update_work_likes_insertの中身とupdate_work_likes_count関数を確認
-- ========================================

-- 1. トリガーの詳細情報を表示
SELECT 
    trigger_name,
    event_manipulation as trigger_event,
    event_object_table as target_table,
    action_timing,
    action_statement,
    action_condition,
    action_orientation,
    action_reference_old_table,
    action_reference_new_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_work_likes_insert'
    AND trigger_schema = 'public';

-- 2. update_work_likes_count関数の完全なソースコードを表示
SELECT 
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    pg_get_functiondef(p.oid) as complete_function_source
FROM pg_proc p
WHERE p.proname = 'update_work_likes_count'
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. すべてのlikes関連トリガーを表示
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%likes%'
    AND trigger_schema = 'public'
ORDER BY trigger_name;

-- 4. pg_triggerテーブルからより詳細な情報を取得
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as is_enabled,
    t.tgtype as trigger_type,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'trigger_update_work_likes_insert';

-- 5. likesテーブルの全トリガーを確認
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as is_enabled,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'likes'::regclass
ORDER BY t.tgname;

-- 6. 現在の関数のバージョンと最終更新日を確認
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.provolatile as volatility,
    pg_stat_get_function_calls(p.oid) as call_count,
    pg_stat_get_function_total_time(p.oid) as total_time_ms
FROM pg_proc p
WHERE p.proname = 'update_work_likes_count'
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 7. 関数の権限を確認
SELECT 
    p.proname as function_name,
    r.rolname as owner,
    p.proacl as access_privileges
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'update_work_likes_count'
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 8. トリガーが無効化されていないか確認（数値で確認）
-- tgenabled: O=enabled, D=disabled, R=replica, A=always
SELECT 
    tgname,
    CASE tgenabled
        WHEN 'O' THEN 'Enabled'
        WHEN 'D' THEN 'Disabled'
        WHEN 'R' THEN 'Replica only'
        WHEN 'A' THEN 'Always'
        ELSE 'Unknown'
    END as status
FROM pg_trigger
WHERE tgrelid = 'likes'::regclass
    AND tgname LIKE '%update_work_likes%';