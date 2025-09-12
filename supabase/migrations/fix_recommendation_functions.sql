-- PostgreSQL推薦関数の修正版

-- 既存の関数を削除して再作成
DROP FUNCTION IF EXISTS get_personalized_recommendations(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_personalized_strategy(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_adaptive_strategy(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_popular_strategy(UUID, INTEGER, INTEGER);

-- 個人化推薦を取得するPostgreSQL関数（修正版）
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
DECLARE
  user_behavior_count INTEGER;
  recommendation_strategy TEXT;
BEGIN
  -- ユーザーの行動データ量を取得して戦略を決定
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM likes WHERE user_id = p_user_id) +
      (SELECT COUNT(*) FROM bookmarks WHERE user_id = p_user_id) +
      (SELECT COUNT(*) FROM views_log WHERE user_id = p_user_id) +
      (SELECT COUNT(*) FROM reviews WHERE user_id = p_user_id),
      0
    )
  INTO user_behavior_count;
  
  -- 戦略決定
  IF user_behavior_count >= 50 THEN
    recommendation_strategy := 'personalized';
  ELSIF user_behavior_count >= 10 THEN
    recommendation_strategy := 'adaptive';
  ELSE
    recommendation_strategy := 'popular';
  END IF;
  
  -- 戦略に応じて推薦を実行
  IF recommendation_strategy = 'personalized' THEN
    RETURN QUERY SELECT * FROM get_personalized_strategy_v2(p_user_id, p_limit, p_offset);
  ELSIF recommendation_strategy = 'adaptive' THEN
    RETURN QUERY SELECT * FROM get_adaptive_strategy_v2(p_user_id, p_limit, p_offset);
  ELSE
    RETURN QUERY SELECT * FROM get_popular_strategy_v2(p_user_id, p_limit, p_offset);
  END IF;
END;
$$;

-- 個人化戦略（修正版）
CREATE OR REPLACE FUNCTION get_personalized_strategy_v2(
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
  WITH 
  -- ユーザーが除外する作品ID
  excluded_works AS (
    SELECT l.work_id FROM likes l WHERE l.user_id = p_user_id
    UNION
    SELECT b.work_id FROM bookmarks b WHERE b.user_id = p_user_id
    UNION 
    SELECT v.work_id FROM views_log v WHERE v.user_id = p_user_id
  ),
  
  -- フォロー作家の作品
  followed_works AS (
    SELECT 
      w.work_id,
      w.title,
      w.description,
      w.image_url,
      w.category,
      w.tags,
      u.username as author,
      u.username as author_username,
      COALESCE(w.views_count, 0) as views,
      COALESCE(w.likes_count, 0) as likes,
      COALESCE(w.comments_count, 0) as comments,
      8.0::DECIMAL(5,2) as recommendation_score,
      'フォロー作家の作品' as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    JOIN follows f ON f.followed_id = w.user_id 
    WHERE f.follower_id = p_user_id 
      AND f.status = 'approved'
      AND w.is_published = true
      AND w.work_id NOT IN (SELECT ew.work_id FROM excluded_works ew)
    ORDER BY w.created_at DESC
    LIMIT 20
  ),
  
  -- 人気作品（フォールバック）
  popular_works AS (
    SELECT 
      w.work_id,
      w.title,
      w.description,
      w.image_url,
      w.category,
      w.tags,
      u.username as author,
      u.username as author_username,
      COALESCE(w.views_count, 0) as views,
      COALESCE(w.likes_count, 0) as likes,
      COALESCE(w.comments_count, 0) as comments,
      (COALESCE(w.trend_score, 0) / 10.0)::DECIMAL(5,2) as recommendation_score,
      '人気作品' as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    WHERE w.is_published = true
      AND w.work_id NOT IN (SELECT ew.work_id FROM excluded_works ew)
    ORDER BY COALESCE(w.trend_score, 0) DESC, COALESCE(w.likes_count, 0) DESC
    LIMIT 30
  ),
  
  -- 統合結果
  all_recommendations AS (
    SELECT * FROM followed_works
    UNION ALL
    SELECT * FROM popular_works
  )
  
  SELECT DISTINCT ON (ar.work_id)
    ar.work_id,
    ar.title,
    ar.description,
    ar.image_url,
    ar.category,
    ar.tags,
    ar.author,
    ar.author_username,
    ar.views,
    ar.likes,
    ar.comments,
    ar.recommendation_score,
    ar.recommendation_reason,
    ar.created_at
  FROM all_recommendations ar
  ORDER BY ar.work_id, ar.recommendation_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 適応的戦略（修正版）
CREATE OR REPLACE FUNCTION get_adaptive_strategy_v2(
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
  WITH combined_recommendations AS (
    -- 個人化推薦 (60%)
    SELECT *, 'personalized' as source 
    FROM get_personalized_strategy_v2(p_user_id, (p_limit * 6 / 10), 0)
    
    UNION ALL
    
    -- 人気作品 (40%)
    SELECT *, 'popular' as source 
    FROM get_popular_strategy_v2(NULL, (p_limit * 4 / 10), 0)
  )
  SELECT 
    cr.work_id, cr.title, cr.description, cr.image_url, cr.category, 
    cr.tags, cr.author, cr.author_username, cr.views, cr.likes, 
    cr.comments, cr.recommendation_score, cr.recommendation_reason, cr.created_at
  FROM combined_recommendations cr
  ORDER BY cr.recommendation_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 人気ベース戦略（修正版）
CREATE OR REPLACE FUNCTION get_popular_strategy_v2(
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
  WITH popular_works AS (
    SELECT 
      w.work_id,
      w.title,
      w.description,
      w.image_url,
      w.category,
      w.tags,
      u.username as author,
      u.username as author_username,
      COALESCE(w.views_count, 0) as views,
      COALESCE(w.likes_count, 0) as likes,
      COALESCE(w.comments_count, 0) as comments,
      (COALESCE(w.trend_score, 0) / 10.0)::DECIMAL(5,2) as recommendation_score,
      '人気作品' as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    WHERE w.is_published = true
      AND (p_user_id IS NULL OR w.work_id NOT IN (
        SELECT l.work_id FROM likes l WHERE l.user_id = p_user_id
        UNION
        SELECT b.work_id FROM bookmarks b WHERE b.user_id = p_user_id
      ))
    ORDER BY 
      COALESCE(w.trend_score, 0) DESC,
      COALESCE(w.likes_count, 0) DESC,
      COALESCE(w.views_count, 0) DESC
  )
  SELECT * FROM popular_works
  LIMIT p_limit OFFSET p_offset;
END;
$$;