-- PostgreSQL推薦関数の曖昧な列参照エラー修正

-- 個人化戦略の修正版
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
  -- 最近読んだ作品の除外リスト（読了率10%超えで24時間以内）
  recently_read AS (
    SELECT rp.work_id
    FROM reading_progress rp
    WHERE rp.user_id = p_user_id
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
  
  -- ユーザーの嗜好分析（直近30日）
  user_preferences AS (
    SELECT 
      pref_category,
      pref_tag,
      SUM(pref_weight) as preference_weight
    FROM (
      -- いいね履歴から嗜好抽出
      SELECT 
        w1.category as pref_category,
        unnest(w1.tags) as pref_tag,
        15 as pref_weight
      FROM works w1
      JOIN likes l1 ON l1.work_id = w1.work_id 
      WHERE l1.user_id = p_user_id 
        AND l1.liked_at > NOW() - INTERVAL '30 days'
        
      UNION ALL
      
      -- ブックマーク履歴から嗜好抽出  
      SELECT 
        w2.category as pref_category,
        unnest(w2.tags) as pref_tag,
        20 as pref_weight
      FROM works w2
      JOIN bookmarks b1 ON b1.work_id = w2.work_id
      WHERE b1.user_id = p_user_id 
        AND b1.bookmarked_at > NOW() - INTERVAL '30 days'
        
      UNION ALL
      
      -- レビュー履歴から嗜好抽出
      SELECT 
        w3.category as pref_category,
        unnest(w3.tags) as pref_tag,
        10 as pref_weight
      FROM works w3
      JOIN reviews r1 ON r1.work_id = w3.work_id
      WHERE r1.user_id = p_user_id 
        AND r1.created_at > NOW() - INTERVAL '30 days'
        
      UNION ALL
      
      -- 閲覧履歴から嗜好抽出（2回以上のみ）
      SELECT 
        w4.category as pref_category,
        unnest(w4.tags) as pref_tag,
        COUNT(*) * 3 as pref_weight
      FROM works w4
      JOIN views_log v1 ON v1.work_id = w4.work_id
      WHERE v1.user_id = p_user_id 
        AND v1.viewed_at > NOW() - INTERVAL '30 days'
      GROUP BY w4.category, unnest(w4.tags)
      HAVING COUNT(*) >= 2
    ) pref_union
    GROUP BY pref_category, pref_tag
  ),
  
  -- 類似ユーザー検索（協調フィルタリング）
  similar_users AS (
    SELECT 
      su.similar_user_id,
      su.common_interactions,
      su.jaccard_similarity
    FROM (
      SELECT 
        other_user.user_id as similar_user_id,
        COUNT(*) as common_interactions,
        COUNT(*) * 1.0 / GREATEST(
          (SELECT COUNT(DISTINCT l2.work_id) FROM likes l2 WHERE l2.user_id = p_user_id) +
          (SELECT COUNT(DISTINCT l3.work_id) FROM likes l3 WHERE l3.user_id = other_user.user_id) -
          COUNT(*), 1
        ) as jaccard_similarity
      FROM (
        SELECT l4.user_id, l4.work_id FROM likes l4 WHERE l4.user_id != p_user_id
        UNION 
        SELECT b2.user_id, b2.work_id FROM bookmarks b2 WHERE b2.user_id != p_user_id
      ) other_user
      JOIN (
        SELECT l5.work_id FROM likes l5 WHERE l5.user_id = p_user_id
        UNION
        SELECT b3.work_id FROM bookmarks b3 WHERE b3.user_id = p_user_id
      ) user_interactions ON user_interactions.work_id = other_user.work_id
      GROUP BY other_user.user_id
    ) su
    WHERE su.common_interactions >= 3 AND su.jaccard_similarity > 0.1
    ORDER BY su.jaccard_similarity DESC
    LIMIT 50
  ),
  
  -- フォロー作家の作品
  followed_author_works AS (
    SELECT 
      w5.work_id,
      w5.title,
      w5.description,
      w5.image_url,
      w5.category,
      w5.tags,
      u1.username as author,
      u1.username as author_username,
      COALESCE(w5.views_count, 0) as views,
      COALESCE(w5.likes_count, 0) as likes,
      COALESCE(w5.comments_count, 0) as comments,
      8.0 + (COALESCE(w5.trend_score, 0) / 100.0) + COALESCE(cs1.ctr_bonus, 0) + COALESCE(cs1.engagement_bonus, 0) as recommendation_score,
      'フォロー作家の新作' as recommendation_reason,
      w5.created_at
    FROM works w5
    JOIN users u1 ON u1.id = w5.user_id
    JOIN follows f1 ON f1.followed_id = w5.user_id
    LEFT JOIN ctr_scores cs1 ON cs1.work_id = w5.work_id
    WHERE f1.follower_id = p_user_id 
      AND f1.status = 'approved'
      AND w5.is_published = true
      AND w5.work_id NOT IN (SELECT rr.work_id FROM recently_read rr)
      AND w5.work_id NOT IN (
        SELECT l6.work_id FROM likes l6 WHERE l6.user_id = p_user_id
        UNION
        SELECT b4.work_id FROM bookmarks b4 WHERE b4.user_id = p_user_id
        UNION 
        SELECT v2.work_id FROM views_log v2 WHERE v2.user_id = p_user_id
      )
    ORDER BY w5.created_at DESC
  ),
  
  -- 協調フィルタリング推薦
  collaborative_recommendations AS (
    SELECT 
      w6.work_id,
      w6.title,
      w6.description,
      w6.image_url,
      w6.category,
      w6.tags,
      u2.username as author,
      u2.username as author_username,
      COALESCE(w6.views_count, 0) as views,
      COALESCE(w6.likes_count, 0) as likes,
      COALESCE(w6.comments_count, 0) as comments,
      6.0 + AVG(su2.jaccard_similarity) * 4.0 + COALESCE(cs2.ctr_bonus, 0) + COALESCE(cs2.engagement_bonus, 0) as recommendation_score,
      '類似ユーザーが気に入った作品' as recommendation_reason,
      w6.created_at
    FROM similar_users su2
    JOIN (
      SELECT l7.user_id, l7.work_id FROM likes l7
      UNION
      SELECT b5.user_id, b5.work_id FROM bookmarks b5
    ) user_likes ON user_likes.user_id = su2.similar_user_id
    JOIN works w6 ON w6.work_id = user_likes.work_id
    JOIN users u2 ON u2.id = w6.user_id
    LEFT JOIN ctr_scores cs2 ON cs2.work_id = w6.work_id
    WHERE w6.is_published = true
      AND w6.work_id NOT IN (SELECT rr2.work_id FROM recently_read rr2)
      AND w6.work_id NOT IN (
        SELECT l8.work_id FROM likes l8 WHERE l8.user_id = p_user_id
        UNION
        SELECT b6.work_id FROM bookmarks b6 WHERE b6.user_id = p_user_id
        UNION
        SELECT v3.work_id FROM views_log v3 WHERE v3.user_id = p_user_id
      )
    GROUP BY w6.work_id, w6.title, w6.description, w6.image_url, w6.category, 
             w6.tags, u2.username, w6.views_count, w6.likes_count, w6.comments_count, 
             w6.created_at, cs2.ctr_bonus, cs2.engagement_bonus
  ),
  
  -- コンテンツベース推薦（嗜好マッチング）
  content_based_recommendations AS (
    SELECT 
      w7.work_id,
      w7.title,
      w7.description,
      w7.image_url,
      w7.category,
      w7.tags,
      u3.username as author,
      u3.username as author_username,
      COALESCE(w7.views_count, 0) as views,
      COALESCE(w7.likes_count, 0) as likes,
      COALESCE(w7.comments_count, 0) as comments,
      5.0 + 
      CASE WHEN up_cat.preference_weight > 0 THEN 2.0 ELSE 0.0 END +
      COALESCE(up_tag.total_tag_weight / 10.0, 0.0) +
      (COALESCE(w7.trend_score, 0) / 100.0) +
      COALESCE(cs3.ctr_bonus, 0) + COALESCE(cs3.engagement_bonus, 0) as recommendation_score,
      CASE 
        WHEN up_cat.preference_weight > 0 AND up_tag.total_tag_weight > 0 
        THEN 'あなたの好みに似た作品'
        WHEN up_cat.preference_weight > 0 
        THEN 'お気に入りカテゴリの作品'
        WHEN up_tag.total_tag_weight > 0 
        THEN '興味のあるタグの作品'
        ELSE '話題の作品'
      END as recommendation_reason,
      w7.created_at
    FROM works w7
    JOIN users u3 ON u3.id = w7.user_id
    LEFT JOIN user_preferences up_cat ON up_cat.pref_category = w7.category
    LEFT JOIN (
      SELECT 
        w8.work_id,
        SUM(up2.preference_weight) as total_tag_weight
      FROM works w8
      CROSS JOIN unnest(w8.tags) as work_tag
      JOIN user_preferences up2 ON up2.pref_tag = work_tag
      GROUP BY w8.work_id
    ) up_tag ON up_tag.work_id = w7.work_id
    LEFT JOIN ctr_scores cs3 ON cs3.work_id = w7.work_id
    WHERE w7.is_published = true
      AND w7.user_id != p_user_id
      AND (up_cat.preference_weight > 0 OR up_tag.total_tag_weight > 0 OR w7.trend_score > 50)
      AND w7.work_id NOT IN (SELECT rr3.work_id FROM recently_read rr3)
      AND w7.work_id NOT IN (
        SELECT l9.work_id FROM likes l9 WHERE l9.user_id = p_user_id
        UNION
        SELECT b7.work_id FROM bookmarks b7 WHERE b7.user_id = p_user_id
        UNION
        SELECT v4.work_id FROM views_log v4 WHERE v4.user_id = p_user_id
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