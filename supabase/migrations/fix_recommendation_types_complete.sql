-- PostgreSQL推薦関数の型不一致エラー修正（完全版）

-- メイン関数の修正
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
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  recommendation_score DECIMAL(5,2),
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _internal
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
    RETURN QUERY SELECT * FROM get_personalized_strategy(p_user_id, p_limit, p_offset);
  ELSIF recommendation_strategy = 'adaptive' THEN
    RETURN QUERY SELECT * FROM get_adaptive_strategy(p_user_id, p_limit, p_offset);
  ELSE
    RETURN QUERY SELECT * FROM get_popular_strategy(p_user_id, p_limit, p_offset);
  END IF;
END;
$$;

-- 適応的戦略の修正
CREATE OR REPLACE FUNCTION get_adaptive_strategy(
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
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
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
    FROM get_personalized_strategy(p_user_id, p_limit * 6 / 10, 0)
    
    UNION ALL
    
    -- 人気作品 (40%)
    SELECT *, 'popular' as source 
    FROM get_popular_strategy(p_user_id, p_limit * 4 / 10, 0)
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

-- 人気ベース戦略の修正（CTRスコア付き）
CREATE OR REPLACE FUNCTION get_popular_strategy(
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
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  recommendation_score DECIMAL(5,2),
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- 最近読んだ作品の除外リスト（ユーザーIDがある場合のみ）
  recently_read AS (
    SELECT rp.work_id
    FROM reading_progress rp
    WHERE p_user_id IS NOT NULL 
      AND rp.user_id = p_user_id
      AND rp.progress_percentage > 10
      AND rp.last_read_at > NOW() - INTERVAL '24 hours'
  ),
  
  -- CTRスコアの取得
  ctr_scores AS (
    SELECT 
      wcs.work_id,
      CASE 
        WHEN wcs.ctr_unique >= 0.15 THEN 2.0
        WHEN wcs.ctr_unique >= 0.05 THEN 1.5
        WHEN wcs.ctr_unique >= 0.01 THEN 1.0
        WHEN wcs.ctr_unique > 0 THEN 0.5
        ELSE 0
      END as ctr_bonus,
      CASE
        WHEN wcs.avg_display_duration >= 5000 THEN 0.5
        ELSE 0
      END as engagement_bonus
    FROM work_ctr_stats wcs
  ),
  
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
      COALESCE(w.trend_score, 0) / 10.0 + COALESCE(cs.ctr_bonus, 0) + COALESCE(cs.engagement_bonus, 0) as recommendation_score,
      '人気作品' as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    LEFT JOIN ctr_scores cs ON cs.work_id = w.work_id
    WHERE w.is_published = true
      AND w.work_id NOT IN (SELECT rr.work_id FROM recently_read rr)
      AND (p_user_id IS NULL OR w.work_id NOT IN (
        SELECT l.work_id FROM likes l WHERE l.user_id = p_user_id
        UNION
        SELECT b.work_id FROM bookmarks b WHERE b.user_id = p_user_id
      ))
    ORDER BY 
      recommendation_score DESC,
      COALESCE(w.likes_count, 0) DESC,
      COALESCE(w.views_count, 0) DESC
  )
  SELECT * FROM popular_works
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 権限設定
REVOKE EXECUTE ON FUNCTION get_personalized_recommendations FROM public;
GRANT EXECUTE ON FUNCTION get_personalized_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION get_personalized_recommendations TO service_role;