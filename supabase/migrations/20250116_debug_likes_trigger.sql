-- ========================================
-- デバッグ用: いいね機能のトリガー関数デバッグ
-- Date: 2025-01-16
-- Description: update_work_likes_count関数にデバッグログを追加
-- ========================================

-- ========================================
-- Step 1: デバッグログテーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id SERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  log_message TEXT NOT NULL,
  log_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_function_name ON public.debug_logs(function_name);

-- ========================================
-- Step 2: デバッグログ記録用の関数
-- ========================================
CREATE OR REPLACE FUNCTION public.log_debug(
  p_function_name TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.debug_logs (function_name, log_message, log_data)
  VALUES (p_function_name, p_message, p_data);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Step 3: update_work_likes_count関数をデバッグ版に更新
-- ========================================
CREATE OR REPLACE FUNCTION public.update_work_likes_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_current_likes INTEGER;
  v_work_exists BOOLEAN;
  v_update_result INTEGER;
BEGIN
  -- デバッグ: 関数開始をログ
  PERFORM log_debug('update_work_likes_count', 
    'Function started', 
    jsonb_build_object(
      'TG_OP', TG_OP,
      'work_id', COALESCE(NEW.work_id, OLD.work_id),
      'user_id', COALESCE(NEW.user_id, OLD.user_id)
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
    
    -- いいね追加
    UPDATE works 
    SET 
      likes = COALESCE(likes, 0) + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    
    GET DIAGNOSTICS v_update_result = ROW_COUNT;
    
    -- 更新後のlikes数を取得
    SELECT likes INTO v_current_likes FROM works WHERE work_id = NEW.work_id;
    
    PERFORM log_debug('update_work_likes_count', 'UPDATE executed for INSERT', 
      jsonb_build_object(
        'work_id', NEW.work_id, 
        'rows_updated', v_update_result,
        'new_likes_count', v_current_likes
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
    
    -- いいね削除
    UPDATE works 
    SET 
      likes = GREATEST(0, COALESCE(likes, 0) - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    
    GET DIAGNOSTICS v_update_result = ROW_COUNT;
    
    -- 更新後のlikes数を取得
    SELECT likes INTO v_current_likes FROM works WHERE work_id = OLD.work_id;
    
    PERFORM log_debug('update_work_likes_count', 'UPDATE executed for DELETE', 
      jsonb_build_object(
        'work_id', OLD.work_id, 
        'rows_updated', v_update_result,
        'new_likes_count', v_current_likes
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

-- ========================================
-- Step 4: トリガーが正しく設定されているか確認
-- ========================================
-- 既存のトリガーを一旦削除して再作成（重複防止）
DROP TRIGGER IF EXISTS trigger_update_work_likes_delete ON public.likes;
DROP TRIGGER IF EXISTS trigger_update_work_likes_insert ON public.likes;

-- トリガーを再作成
CREATE TRIGGER trigger_update_work_likes_insert 
  AFTER INSERT ON public.likes 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_work_likes_count();

CREATE TRIGGER trigger_update_work_likes_delete 
  AFTER DELETE ON public.likes 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_work_likes_count();

-- ========================================
-- Step 5: worksテーブルのlikesカラムの状態を確認
-- ========================================
-- likesカラムがNULLの場合は0に初期化
UPDATE works 
SET likes = 0 
WHERE likes IS NULL;

-- likes_countとlikesの値を同期（まだlikes_countが残っている場合）
UPDATE works 
SET likes = COALESCE(likes_count, 0)
WHERE likes != COALESCE(likes_count, 0);

-- ========================================
-- Step 6: デバッグ用のビュー作成（最新のログを簡単に確認）
-- ========================================
CREATE OR REPLACE VIEW public.recent_debug_logs AS
SELECT 
  id,
  function_name,
  log_message,
  log_data,
  created_at
FROM public.debug_logs
ORDER BY created_at DESC
LIMIT 100;

-- ========================================
-- Step 7: テスト用のクエリ
-- ========================================
-- このクエリを実行してログを確認:
-- SELECT * FROM recent_debug_logs WHERE function_name = 'update_work_likes_count';

-- 手動でいいねを追加してテスト（実際のwork_idとuser_idに置き換えて実行）:
-- INSERT INTO likes (work_id, user_id) VALUES ('実際のwork_id', '実際のuser_id');
-- SELECT * FROM recent_debug_logs WHERE function_name = 'update_work_likes_count' ORDER BY created_at DESC LIMIT 10;

-- いいねを削除してテスト:
-- DELETE FROM likes WHERE work_id = '実際のwork_id' AND user_id = '実際のuser_id';
-- SELECT * FROM recent_debug_logs WHERE function_name = 'update_work_likes_count' ORDER BY created_at DESC LIMIT 10;

-- worksテーブルのlikes数を確認:
-- SELECT work_id, title, likes, likes_count FROM works WHERE work_id = '実際のwork_id';