-- ユーザー嗜好キャッシュ関数の追加（既存関数の型エラー解決）

-- 既存の関数を削除（型変更のため）
DROP FUNCTION IF EXISTS get_user_preferences_cache(UUID);

-- ユーザー嗜好キャッシュ取得関数を再作成
CREATE OR REPLACE FUNCTION get_user_preferences_cache(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _internal
AS $$
DECLARE
  preferences_data JSON;
BEGIN
  SELECT json_build_object(
    'preferred_categories', COALESCE(upc.preferred_categories, ARRAY[]::TEXT[]),
    'preferred_tags', COALESCE(upc.preferred_tags, ARRAY[]::TEXT[]),
    'total_behavior_score', COALESCE(upc.total_behavior_score, 0),
    'last_updated', upc.last_updated
  )
  INTO preferences_data
  FROM _internal.user_preferences_cache upc
  WHERE upc.user_id = p_user_id;
  
  -- ユーザーが見つからない場合は空のデータを返す
  IF preferences_data IS NULL THEN
    preferences_data := json_build_object(
      'preferred_categories', ARRAY[]::TEXT[],
      'preferred_tags', ARRAY[]::TEXT[],
      'total_behavior_score', 0,
      'last_updated', NULL
    );
  END IF;
  
  RETURN preferences_data;
END;
$$;

-- 権限設定
REVOKE EXECUTE ON FUNCTION get_user_preferences_cache FROM public;
GRANT EXECUTE ON FUNCTION get_user_preferences_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferences_cache TO service_role;