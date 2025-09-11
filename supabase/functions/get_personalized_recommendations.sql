-- 個人化推薦を取得するPostgreSQL関数
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
    RETURN QUERY SELECT * FROM get_personalized_strategy(p_user_id, p_limit, p_offset);
  ELSIF recommendation_strategy = 'adaptive' THEN
    RETURN QUERY SELECT * FROM get_adaptive_strategy(p_user_id, p_limit, p_offset);
  ELSE
    RETURN QUERY SELECT * FROM get_popular_strategy(p_user_id, p_limit, p_offset);
  END IF;
END;
$$;

-- 個人化戦略（協調フィルタリング + コンテンツベース）
CREATE OR REPLACE FUNCTION get_personalized_strategy(
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
  -- ユーザーの嗜好分析（直近30日）
  user_preferences AS (
    SELECT 
      w.category,
      unnest(w.tags) as tag,
      COUNT(*) * 
      CASE 
        WHEN l.liked_at IS NOT NULL THEN 15  -- いいね重み
        WHEN b.bookmarked_at IS NOT NULL THEN 20  -- ブックマーク重み
        WHEN r.created_at IS NOT NULL THEN 10  -- レビュー重み
        ELSE 5  -- 閲覧重み
      END as preference_weight
    FROM works w
    LEFT JOIN likes l ON l.work_id = w.work_id AND l.user_id = p_user_id 
      AND l.liked_at > NOW() - INTERVAL '30 days'
    LEFT JOIN bookmarks b ON b.work_id = w.work_id AND b.user_id = p_user_id 
      AND b.bookmarked_at > NOW() - INTERVAL '30 days'
    LEFT JOIN reviews r ON r.work_id = w.work_id AND r.user_id = p_user_id 
      AND r.created_at > NOW() - INTERVAL '30 days'
    LEFT JOIN views_log v ON v.work_id = w.work_id AND v.user_id = p_user_id 
      AND v.viewed_at > NOW() - INTERVAL '30 days'
    WHERE (l.liked_at IS NOT NULL OR b.bookmarked_at IS NOT NULL 
           OR r.created_at IS NOT NULL OR v.viewed_at IS NOT NULL)
    GROUP BY w.category, unnest(w.tags)
  ),
  
  -- 類似ユーザー検索（協調フィルタリング）
  similar_users AS (
    SELECT 
      other_user.user_id as similar_user_id,
      COUNT(*) as common_interactions,
      COUNT(*) * 1.0 / GREATEST(
        (SELECT COUNT(DISTINCT work_id) FROM likes WHERE user_id = p_user_id) +
        (SELECT COUNT(DISTINCT work_id) FROM likes WHERE user_id = other_user.user_id) -
        COUNT(*), 1
      ) as jaccard_similarity
    FROM (
      SELECT user_id, work_id FROM likes WHERE user_id != p_user_id
      UNION 
      SELECT user_id, work_id FROM bookmarks WHERE user_id != p_user_id
    ) other_user
    JOIN (
      SELECT work_id FROM likes WHERE user_id = p_user_id
      UNION
      SELECT work_id FROM bookmarks WHERE user_id = p_user_id
    ) user_interactions ON user_interactions.work_id = other_user.work_id
    GROUP BY other_user.user_id
    HAVING COUNT(*) >= 3 AND jaccard_similarity > 0.1
    ORDER BY jaccard_similarity DESC
    LIMIT 50
  ),
  
  -- フォロー作家の作品
  followed_author_works AS (
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
      8.0 + (COALESCE(w.trend_score, 0) / 100.0) as recommendation_score,
      'フォロー作家の新作' as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    JOIN follows f ON f.followed_id = w.user_id 
    WHERE f.follower_id = p_user_id 
      AND f.status = 'approved'
      AND w.is_published = true
      AND w.work_id NOT IN (
        SELECT work_id FROM likes WHERE user_id = p_user_id
        UNION
        SELECT work_id FROM bookmarks WHERE user_id = p_user_id
        UNION 
        SELECT work_id FROM views_log WHERE user_id = p_user_id
      )
    ORDER BY w.created_at DESC
  ),
  
  -- 協調フィルタリング推薦
  collaborative_recommendations AS (
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
      6.0 + AVG(su.jaccard_similarity) * 4.0 as recommendation_score,
      '類似ユーザーが気に入った作品' as recommendation_reason,
      w.created_at
    FROM similar_users su
    JOIN (
      SELECT user_id, work_id FROM likes
      UNION
      SELECT user_id, work_id FROM bookmarks  
    ) user_likes ON user_likes.user_id = su.similar_user_id
    JOIN works w ON w.work_id = user_likes.work_id
    JOIN users u ON u.id = w.user_id
    WHERE w.is_published = true
      AND w.work_id NOT IN (
        SELECT work_id FROM likes WHERE user_id = p_user_id
        UNION
        SELECT work_id FROM bookmarks WHERE user_id = p_user_id
        UNION
        SELECT work_id FROM views_log WHERE user_id = p_user_id
      )
    GROUP BY w.work_id, w.title, w.description, w.image_url, w.category, 
             w.tags, u.username, w.views_count, w.likes_count, w.comments_count, w.created_at
  ),
  
  -- コンテンツベース推薦（嗜好マッチング）
  content_based_recommendations AS (
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
      5.0 + 
      CASE WHEN up_cat.preference_weight > 0 THEN 2.0 ELSE 0.0 END +
      COALESCE(up_tag.total_tag_weight / 10.0, 0.0) +
      (COALESCE(w.trend_score, 0) / 100.0) as recommendation_score,
      CASE 
        WHEN up_cat.preference_weight > 0 AND up_tag.total_tag_weight > 0 
        THEN 'あなたの好みに似た作品'
        WHEN up_cat.preference_weight > 0 
        THEN 'お気に入りカテゴリの作品'
        WHEN up_tag.total_tag_weight > 0 
        THEN '興味のあるタグの作品'
        ELSE '話題の作品'
      END as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    LEFT JOIN user_preferences up_cat ON up_cat.category = w.category
    LEFT JOIN (
      SELECT 
        w2.work_id,
        SUM(up.preference_weight) as total_tag_weight
      FROM works w2
      CROSS JOIN unnest(w2.tags) as work_tag
      JOIN user_preferences up ON up.tag = work_tag
      GROUP BY w2.work_id
    ) up_tag ON up_tag.work_id = w.work_id
    WHERE w.is_published = true
      AND w.user_id != p_user_id
      AND (up_cat.preference_weight > 0 OR up_tag.total_tag_weight > 0 OR w.trend_score > 50)
      AND w.work_id NOT IN (
        SELECT work_id FROM likes WHERE user_id = p_user_id
        UNION
        SELECT work_id FROM bookmarks WHERE user_id = p_user_id
        UNION
        SELECT work_id FROM views_log WHERE user_id = p_user_id
      )
  ),
  
  -- 全推薦を統合
  all_recommendations AS (
    SELECT * FROM followed_author_works
    UNION ALL
    SELECT * FROM collaborative_recommendations
    UNION ALL
    SELECT * FROM content_based_recommendations
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

-- 適応的戦略（個人化 + 人気）
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
    FROM get_personalized_strategy(p_user_id, p_limit * 6 / 10, 0)
    
    UNION ALL
    
    -- 人気作品 (40%)
    SELECT *, 'popular' as source 
    FROM get_popular_strategy(NULL, p_limit * 4 / 10, 0)
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

-- 人気ベース戦略
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
      COALESCE(w.trend_score, 0) / 10.0 as recommendation_score,
      '人気作品' as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    WHERE w.is_published = true
      AND (p_user_id IS NULL OR w.work_id NOT IN (
        SELECT work_id FROM likes WHERE user_id = p_user_id
        UNION
        SELECT work_id FROM bookmarks WHERE user_id = p_user_id
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