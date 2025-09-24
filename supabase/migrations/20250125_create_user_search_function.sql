-- ========================================
-- 高速ユーザー検索関数（トライグラム使用）
-- ========================================

-- トライグラム類似度検索を使った高速ユーザー検索関数
CREATE OR REPLACE FUNCTION search_users_fast(
  search_query TEXT,
  sort_by TEXT DEFAULT 'followers',
  search_limit INTEGER DEFAULT 50,
  search_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  username TEXT,
  custom_user_id TEXT,
  bio TEXT,
  avatar_img_url TEXT,
  works_count INTEGER,
  followers_count INTEGER,
  following_count INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  sort_column TEXT;
BEGIN
  -- ソート列を決定
  CASE sort_by
    WHEN 'followers' THEN sort_column := 'followers_count DESC';
    WHEN 'following' THEN sort_column := 'following_count DESC';  
    WHEN 'works' THEN sort_column := 'works_count DESC';
    ELSE sort_column := 'username ASC';
  END CASE;

  -- クエリが空の場合は空の結果を返す
  IF search_query IS NULL OR trim(search_query) = '' THEN
    RETURN;
  END IF;

  -- トライグラム類似度検索を実行
  RETURN QUERY EXECUTE format('
    SELECT 
      u.id,
      u.username,
      u.custom_user_id,
      u.bio,
      u.avatar_img_url,
      u.works_count,
      u.followers_count,
      u.following_count
    FROM users u
    WHERE 
      (u.username IS NOT NULL AND u.username %% $1) OR
      (u.custom_user_id IS NOT NULL AND u.custom_user_id %% $1) OR
      (u.bio IS NOT NULL AND u.bio %% $1) OR
      (u.username ILIKE $2) OR
      (u.custom_user_id ILIKE $2) OR
      (u.bio ILIKE $2)
    ORDER BY 
      -- 類似度が高い順にソート（部分一致よりも優先）
      GREATEST(
        COALESCE(similarity(u.username, $1), 0),
        COALESCE(similarity(u.custom_user_id, $1), 0),
        COALESCE(similarity(u.bio, $1), 0)
      ) DESC,
      %s
    LIMIT $3 OFFSET $4
  ', sort_column)
  USING search_query, '%' || search_query || '%', search_limit, search_offset;
  
END;
$$;

-- 関数の所有者設定
ALTER FUNCTION search_users_fast(TEXT, TEXT, INTEGER, INTEGER) OWNER TO postgres;

-- RLS対応（必要に応じて）
GRANT EXECUTE ON FUNCTION search_users_fast(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_fast(TEXT, TEXT, INTEGER, INTEGER) TO anon;

-- ========================================
-- 完了メッセージ  
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ 高速ユーザー検索関数 search_users_fast() を作成しました';
  RAISE NOTICE '🔍 トライグラム類似度 + ILIKE の両方を使用';
  RAISE NOTICE '⚡ 既存インデックスを最大活用';
END $$;