-- ========================================
-- RLSとトリガー関数の権限確認
-- Date: 2025-01-16
-- Description: update_work_likes_count関数がRLSを突破できているか確認
-- ========================================

-- 1. 現在のworksテーブルのRLSポリシーを確認
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

-- 2. update_work_likes_count関数の詳細を確認
SELECT 
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  r.rolname as owner,
  p.proacl as permissions
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'update_work_likes_count'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. トリガー関数を SECURITY DEFINER に変更（RLS突破）
CREATE OR REPLACE FUNCTION public.update_work_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER  -- これがRLS突破のキー
    SET search_path = public, pg_temp
    AS $$
DECLARE
  v_current_likes INTEGER;
  v_work_exists BOOLEAN;
  v_update_result INTEGER;
BEGIN
  -- デバッグ: 関数開始をログ
  PERFORM log_debug('update_work_likes_count', 
    'Function started with SECURITY DEFINER', 
    jsonb_build_object(
      'TG_OP', TG_OP,
      'work_id', COALESCE(NEW.work_id, OLD.work_id),
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'current_user', current_user,
      'session_user', session_user
    )
  );

  IF TG_OP = 'INSERT' THEN
    -- デバッグ: INSERT処理開始
    PERFORM log_debug('update_work_likes_count', 'INSERT operation started', 
      jsonb_build_object('work_id', NEW.work_id, 'user_id', NEW.user_id)
    );
    
    -- 対象のwork_idが存在するか確認
    SELECT EXISTS(SELECT 1 FROM works WHERE work_id = NEW.work_id) INTO v_work_exists;
    PERFORM log_debug('update_work_likes_count', 'Work exists check', 
      jsonb_build_object('work_id', NEW.work_id, 'exists', v_work_exists)
    );
    
    IF NOT v_work_exists THEN
      PERFORM log_debug('update_work_likes_count', 'Work not found!', 
        jsonb_build_object('work_id', NEW.work_id)
      );
      RETURN NEW;
    END IF;
    
    -- 現在のlikes数を取得
    SELECT likes INTO v_current_likes FROM works WHERE work_id = NEW.work_id;
    PERFORM log_debug('update_work_likes_count', 'Current likes count', 
      jsonb_build_object('work_id', NEW.work_id, 'current_likes', v_current_likes)
    );
    
    -- いいね追加（SECURITY DEFINERでRLS突破）
    UPDATE works 
    SET 
      likes = COALESCE(likes, 0) + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    
    GET DIAGNOSTICS v_update_result = ROW_COUNT;
    
    -- 更新後のlikes数を取得
    SELECT likes INTO v_current_likes FROM works WHERE work_id = NEW.work_id;
    
    PERFORM log_debug('update_work_likes_count', 'UPDATE executed for INSERT with SECURITY DEFINER', 
      jsonb_build_object(
        'work_id', NEW.work_id, 
        'rows_updated', v_update_result,
        'new_likes_count', v_current_likes,
        'executed_as_user', current_user
      )
    );
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- デバッグ: DELETE処理開始
    PERFORM log_debug('update_work_likes_count', 'DELETE operation started', 
      jsonb_build_object('work_id', OLD.work_id, 'user_id', OLD.user_id)
    );
    
    -- 対象のwork_idが存在するか確認
    SELECT EXISTS(SELECT 1 FROM works WHERE work_id = OLD.work_id) INTO v_work_exists;
    PERFORM log_debug('update_work_likes_count', 'Work exists check', 
      jsonb_build_object('work_id', OLD.work_id, 'exists', v_work_exists)
    );
    
    IF NOT v_work_exists THEN
      PERFORM log_debug('update_work_likes_count', 'Work not found!', 
        jsonb_build_object('work_id', OLD.work_id)
      );
      RETURN OLD;
    END IF;
    
    -- 現在のlikes数を取得
    SELECT likes INTO v_current_likes FROM works WHERE work_id = OLD.work_id;
    PERFORM log_debug('update_work_likes_count', 'Current likes count', 
      jsonb_build_object('work_id', OLD.work_id, 'current_likes', v_current_likes)
    );
    
    -- いいね削除（SECURITY DEFINERでRLS突破）
    UPDATE works 
    SET 
      likes = GREATEST(0, COALESCE(likes, 0) - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    
    GET DIAGNOSTICS v_update_result = ROW_COUNT;
    
    -- 更新後のlikes数を取得
    SELECT likes INTO v_current_likes FROM works WHERE work_id = OLD.work_id;
    
    PERFORM log_debug('update_work_likes_count', 'UPDATE executed for DELETE with SECURITY DEFINER', 
      jsonb_build_object(
        'work_id', OLD.work_id, 
        'rows_updated', v_update_result,
        'new_likes_count', v_current_likes,
        'executed_as_user', current_user
      )
    );
    
    RETURN OLD;
  END IF;
  
  -- 予期しない操作
  PERFORM log_debug('update_work_likes_count', 'Unexpected operation', 
    jsonb_build_object('TG_OP', TG_OP)
  );
  
  RETURN NULL;
END;
$$;

-- 4. トリガーを再作成（念のため）
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

-- 5. 関数にSUPERUSER権限を付与（必要に応じて）
-- 注意: これはSupabaseの管理者として実行する必要があります
-- ALTER FUNCTION public.update_work_likes_count() OWNER TO postgres;

-- 6. テスト用クエリ
-- 手動でいいねを追加してテスト（実際のwork_idとuser_idに置き換えて実行）:
/*
-- テスト実行前にログをクリア
DELETE FROM debug_logs WHERE function_name = 'update_work_likes_count';

-- いいねを追加
INSERT INTO likes (work_id, user_id) VALUES ('実際のwork_id', '実際のuser_id');

-- ログを確認
SELECT * FROM debug_logs WHERE function_name = 'update_work_likes_count' ORDER BY created_at DESC;

-- worksテーブルの更新を確認
SELECT work_id, title, likes, stats_last_updated FROM works WHERE work_id = '実際のwork_id';

-- いいねを削除
DELETE FROM likes WHERE work_id = '実際のwork_id' AND user_id = '実際のuser_id';

-- 再度ログを確認
SELECT * FROM debug_logs WHERE function_name = 'update_work_likes_count' ORDER BY created_at DESC LIMIT 10;
*/