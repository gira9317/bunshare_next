-- ========================================
-- SECURITY DEFINERトリガー関数でlikes同期を確実にする
-- Date: 2025-01-16
-- Description: likesテーブルとworks.likesを完全に同期させる
-- ========================================

-- 1. 既存データの同期（実行前の状態を確認）
-- 現在の不整合を確認
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
  COALESCE(lc.actual_count, 0) as actual_like_count,
  CASE 
    WHEN w.likes != COALESCE(lc.actual_count, 0) THEN '❌ 不整合'
    ELSE '✅ 整合'
  END as status
FROM works w
LEFT JOIN like_counts lc ON w.work_id = lc.work_id
WHERE w.likes != COALESCE(lc.actual_count, 0) OR lc.actual_count IS NOT NULL
ORDER BY w.created_at DESC
LIMIT 20;

-- 2. データの同期実行
-- すべてのworksのlikes数を実際のlikesテーブルのカウントに同期
WITH like_counts AS (
  SELECT 
    work_id,
    COUNT(*) as actual_count
  FROM likes
  GROUP BY work_id
)
UPDATE works 
SET 
  likes = COALESCE(lc.actual_count, 0),
  stats_last_updated = NOW()
FROM like_counts lc
WHERE works.work_id = lc.work_id
  AND works.likes != lc.actual_count;

-- likesレコードが存在しない作品のlikes数を0に設定
UPDATE works 
SET 
  likes = 0,
  stats_last_updated = NOW()
WHERE work_id NOT IN (SELECT DISTINCT work_id FROM likes)
  AND likes != 0;

-- 3. SECURITY DEFINER関数の作成（RLS完全バイパス）
CREATE OR REPLACE FUNCTION public.update_work_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER  -- 関数所有者（postgres）として実行
    SET search_path = public, pg_temp
    AS $$
DECLARE
  v_actual_count INTEGER;
  v_old_count INTEGER;
  v_new_count INTEGER;
  v_update_result INTEGER;
BEGIN
  -- デバッグ: 実行コンテキストをログ
  PERFORM log_debug('update_work_likes_count', 
    'SECURITY DEFINER function started', 
    jsonb_build_object(
      'TG_OP', TG_OP,
      'work_id', COALESCE(NEW.work_id, OLD.work_id),
      'trigger_user', current_user,
      'session_user', session_user,
      'effective_user', current_user
    )
  );

  -- 対象のwork_idを決定
  DECLARE
    target_work_id UUID;
  BEGIN
    target_work_id := COALESCE(NEW.work_id, OLD.work_id);
    
    -- 実際のlikesレコード数をカウント
    SELECT COUNT(*) INTO v_actual_count 
    FROM likes 
    WHERE work_id = target_work_id;
    
    -- 現在のworks.likes値を取得
    SELECT likes INTO v_old_count 
    FROM works 
    WHERE work_id = target_work_id;
    
    PERFORM log_debug('update_work_likes_count', 'Count comparison', 
      jsonb_build_object(
        'work_id', target_work_id,
        'actual_likes_count', v_actual_count,
        'stored_likes_count', v_old_count,
        'operation', TG_OP
      )
    );
    
    -- works.likesを実際のカウントに同期
    UPDATE works 
    SET 
      likes = v_actual_count,
      stats_last_updated = NOW()
    WHERE work_id = target_work_id;
    
    GET DIAGNOSTICS v_update_result = ROW_COUNT;
    
    -- 更新後の値を取得して確認
    SELECT likes INTO v_new_count 
    FROM works 
    WHERE work_id = target_work_id;
    
    PERFORM log_debug('update_work_likes_count', 'Sync completed', 
      jsonb_build_object(
        'work_id', target_work_id,
        'old_likes', v_old_count,
        'new_likes', v_new_count,
        'actual_count', v_actual_count,
        'rows_updated', v_update_result,
        'operation', TG_OP,
        'executed_as', current_user
      )
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM log_debug('update_work_likes_count', 'ERROR occurred', 
        jsonb_build_object(
          'work_id', target_work_id,
          'error_message', SQLERRM,
          'error_state', SQLSTATE,
          'operation', TG_OP
        )
      );
      RAISE;
  END;

  -- 戻り値
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- 4. 関数の所有者をpostgresに設定（確実にSECURITY DEFINERが機能するように）
ALTER FUNCTION public.update_work_likes_count() OWNER TO postgres;

-- 5. トリガーを再作成
DROP TRIGGER IF EXISTS trigger_update_work_likes_delete ON public.likes;
DROP TRIGGER IF EXISTS trigger_update_work_likes_insert ON public.likes;

CREATE TRIGGER trigger_update_work_likes_insert 
  AFTER INSERT ON public.likes 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_work_likes_count();

CREATE TRIGGER trigger_update_work_likes_delete 
  AFTER DELETE ON public.likes 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_work_likes_count();

-- 6. 関数とトリガーに適切な権限を付与
GRANT EXECUTE ON FUNCTION public.update_work_likes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_work_likes_count() TO service_role;

-- 7. 整合性チェック関数（管理用）
CREATE OR REPLACE FUNCTION public.check_likes_consistency() 
RETURNS TABLE(
  work_id UUID,
  title TEXT,
  stored_likes INTEGER,
  actual_likes INTEGER,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH like_counts AS (
    SELECT 
      l.work_id,
      COUNT(*) as actual_count
    FROM likes l
    GROUP BY l.work_id
  )
  SELECT 
    w.work_id,
    w.title,
    w.likes as stored_likes,
    COALESCE(lc.actual_count, 0)::INTEGER as actual_likes,
    CASE 
      WHEN w.likes = COALESCE(lc.actual_count, 0) THEN '✅ 整合'
      ELSE '❌ 不整合'
    END as status
  FROM works w
  LEFT JOIN like_counts lc ON w.work_id = lc.work_id
  WHERE w.likes != COALESCE(lc.actual_count, 0) OR lc.actual_count IS NOT NULL
  ORDER BY w.created_at DESC;
END;
$$;

-- 8. 手動同期関数（緊急時用）
CREATE OR REPLACE FUNCTION public.sync_all_likes() 
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- すべてのworksのlikes数を実際のカウントに同期
  WITH like_counts AS (
    SELECT 
      work_id,
      COUNT(*) as actual_count
    FROM likes
    GROUP BY work_id
  )
  UPDATE works 
  SET 
    likes = COALESCE(lc.actual_count, 0),
    stats_last_updated = NOW()
  FROM like_counts lc
  WHERE works.work_id = lc.work_id
    AND works.likes != lc.actual_count;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- likesレコードが存在しない作品のlikes数を0に設定
  UPDATE works 
  SET 
    likes = 0,
    stats_last_updated = NOW()
  WHERE work_id NOT IN (SELECT DISTINCT work_id FROM likes)
    AND likes != 0;
  
  GET DIAGNOSTICS additional_count = ROW_COUNT;
  updated_count = updated_count + additional_count;
  
  RETURN updated_count;
END;
$$;

-- 9. テスト実行
-- デバッグログをクリア
DELETE FROM debug_logs WHERE function_name = 'update_work_likes_count';

-- 実行後は以下で確認:
-- SELECT * FROM check_likes_consistency();
-- SELECT sync_all_likes(); -- 手動同期
-- SELECT * FROM debug_logs WHERE function_name = 'update_work_likes_count' ORDER BY created_at DESC;