-- カラム曖昧性エラーを修正した完全版

-- 既存の関数を削除
DROP FUNCTION IF EXISTS get_personalized_recommendations(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_personalized_strategy_v2(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_adaptive_strategy_v2(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_popular_strategy_v2(UUID, INTEGER, INTEGER);

-- 最もシンプルな推薦関数（エラー回避版）
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) 
RETURNS TABLE (
  work_id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  tags TEXT[],
  author TEXT,
  author_username TEXT,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  recommendation_score DECIMAL(5,2),
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- ユーザーがいる場合は個人化推薦、いない場合は人気推薦
  IF p_user_id IS NOT NULL THEN
    RETURN QUERY SELECT * FROM get_simple_personalized(p_user_id, p_limit, p_offset);
  ELSE
    RETURN QUERY SELECT * FROM get_simple_popular(p_limit, p_offset);
  END IF;
END;
$$;

-- シンプルな個人化推薦
CREATE OR REPLACE FUNCTION get_simple_personalized(
  p_user_id UUID,
  p_limit INTEGER,
  p_offset INTEGER
) 
RETURNS TABLE (
  work_id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  tags TEXT[],
  author TEXT,
  author_username TEXT,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  recommendation_score DECIMAL(5,2),
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.work_id,
    w.title,
    w.description,
    w.image_url,
    w.category,
    w.tags,
    u.username::TEXT as author,
    u.username::TEXT as author_username,
    COALESCE(w.views_count, 0)::INTEGER as views,
    COALESCE(w.likes_count, 0)::INTEGER as likes,
    COALESCE(w.comments_count, 0)::INTEGER as comments,
    COALESCE(
      -- フォロー作家なら高スコア
      CASE WHEN EXISTS(
        SELECT 1 FROM follows f 
        WHERE f.follower_id = p_user_id 
        AND f.followed_id = w.user_id 
        AND f.status = 'approved'
      ) THEN 9.0 
      -- 人気度ベーススコア
      ELSE (w.trend_score / 10.0) END, 
      5.0
    )::DECIMAL(5,2) as recommendation_score,
    CASE WHEN EXISTS(
      SELECT 1 FROM follows f 
      WHERE f.follower_id = p_user_id 
      AND f.followed_id = w.user_id 
      AND f.status = 'approved'
    ) THEN 'フォロー作家の作品'
    ELSE '人気作品' END::TEXT as recommendation_reason,
    w.created_at
  FROM works w
  JOIN users u ON u.id = w.user_id
  WHERE w.is_published = true
    -- 自分の作品は除外
    AND w.user_id != p_user_id
    -- 既にいいね・ブックマーク済みは除外
    AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.user_id = p_user_id AND l.work_id = w.work_id)
    AND NOT EXISTS (SELECT 1 FROM bookmarks b WHERE b.user_id = p_user_id AND b.work_id = w.work_id)
  ORDER BY 
    -- フォロー作家作品を優先
    CASE WHEN EXISTS(
      SELECT 1 FROM follows f 
      WHERE f.follower_id = p_user_id 
      AND f.followed_id = w.user_id 
      AND f.status = 'approved'
    ) THEN 0 ELSE 1 END,
    -- 人気度順
    COALESCE(w.trend_score, 0) DESC,
    COALESCE(w.likes_count, 0) DESC,
    w.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- シンプルな人気推薦
CREATE OR REPLACE FUNCTION get_simple_popular(
  p_limit INTEGER,
  p_offset INTEGER
) 
RETURNS TABLE (
  work_id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  tags TEXT[],
  author TEXT,
  author_username TEXT,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  recommendation_score DECIMAL(5,2),
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.work_id,
    w.title,
    w.description,
    w.image_url,
    w.category,
    w.tags,
    u.username::TEXT as author,
    u.username::TEXT as author_username,
    COALESCE(w.views_count, 0)::INTEGER as views,
    COALESCE(w.likes_count, 0)::INTEGER as likes,
    COALESCE(w.comments_count, 0)::INTEGER as comments,
    COALESCE((w.trend_score / 10.0), 5.0)::DECIMAL(5,2) as recommendation_score,
    '人気作品'::TEXT as recommendation_reason,
    w.created_at
  FROM works w
  JOIN users u ON u.id = w.user_id
  WHERE w.is_published = true
  ORDER BY 
    COALESCE(w.trend_score, 0) DESC,
    COALESCE(w.likes_count, 0) DESC,
    COALESCE(w.views_count, 0) DESC,
    w.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;