-- エンベディングベース推薦を含む個人化推薦システム（v2）
CREATE OR REPLACE FUNCTION get_personalized_recommendations_with_embeddings(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_embedding_weight DECIMAL DEFAULT 0.3  -- エンベディングの重み（0.0-1.0）
) 
RETURNS TABLE (
  out_work_id UUID,
  out_title TEXT,
  out_description TEXT,
  out_image_url TEXT,
  out_category TEXT,
  out_tags TEXT[],
  out_author TEXT,
  out_author_username TEXT,
  out_views BIGINT,
  out_likes BIGINT,
  out_comments BIGINT,
  out_recommendation_score DECIMAL(5,2),
  out_recommendation_reason TEXT,
  out_created_at TIMESTAMPTZ,
  -- エンベディング関連情報
  out_semantic_similarity DECIMAL(5,2),
  out_embedding_match_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _internal
AS $$
DECLARE
  user_behavior_count INTEGER;
  recommendation_strategy TEXT;
  user_embedding_vector vector(1536);
  has_embedding_data BOOLEAN := false;
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
    recommendation_strategy := 'personalized_with_embeddings';
  ELSIF user_behavior_count >= 10 THEN
    recommendation_strategy := 'adaptive_with_embeddings';
  ELSE
    recommendation_strategy := 'popular_with_embeddings';
  END IF;
  
  -- ユーザーの嗜好エンベディングを計算（過去30日のいいね・ブックマーク作品から）
  -- 注意: pgvectorではベクトルの重み付き平均を直接計算できないため、単純平均を使用
  SELECT 
    AVG(we.title_embedding),
    COUNT(*) > 0
  INTO user_embedding_vector, has_embedding_data
  FROM (
    SELECT DISTINCT w.work_id
    FROM works w
    JOIN likes l ON l.work_id = w.work_id 
    WHERE l.user_id = p_user_id 
      AND l.liked_at > NOW() - INTERVAL '30 days'
    
    UNION
    
    SELECT DISTINCT w.work_id
    FROM works w
    JOIN bookmarks b ON b.work_id = w.work_id
    WHERE b.user_id = p_user_id 
      AND b.bookmarked_at > NOW() - INTERVAL '30 days'
  ) user_liked_works
  JOIN _internal.work_embeddings_v2 we ON we.work_id = user_liked_works.work_id
  WHERE we.processing_status = 'completed'
    AND we.title_embedding IS NOT NULL 
    AND we.description_embedding IS NOT NULL;

  RETURN QUERY
  WITH 
  -- 最近読んだ作品の除外（読了率10%以上、1日以内）
  recently_read AS (
    SELECT rp.work_id
    FROM reading_progress rp
    WHERE rp.user_id = p_user_id
      AND rp.progress_percentage >= 10
      AND rp.updated_at > NOW() - INTERVAL '1 day'
  ),
  
  -- CTRスコア計算
  ctr_scores AS (
    SELECT 
      wcs.work_id,
      CASE 
        WHEN wcs.ctr_unique >= 0.15 THEN 2.0  -- 15%以上で2点
        WHEN wcs.ctr_unique >= 0.05 THEN 1.5  -- 5%以上で1.5点
        WHEN wcs.ctr_unique >= 0.01 THEN 1.0  -- 1%以上で1点
        WHEN wcs.ctr_unique > 0 THEN 0.5      -- 0%超えで0.5点
        ELSE 0
      END as ctr_bonus,
      CASE
        WHEN wcs.avg_display_duration >= 5000 THEN 0.5  -- 5秒以上表示で0.5点
        ELSE 0
      END as engagement_bonus
    FROM _internal.work_ctr_stats wcs
  ),
  
  -- エンベディングベース推薦（セマンティック類似性）
  embedding_based_recommendations AS (
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
      
      -- エンベディングスコア計算（タイトルエンベディングのみ使用）
      (1 - (user_embedding_vector <=> we.title_embedding)) * 10.0 as semantic_similarity,
      
      -- 総合スコア（エンベディング + 従来のシグナル）
      4.0 + 
      (1 - (user_embedding_vector <=> we.title_embedding)) * 6.0 * p_embedding_weight +
      (COALESCE(w.trend_score, 0) / 100.0) * (1 - p_embedding_weight) +
      COALESCE(cs.ctr_bonus, 0) + COALESCE(cs.engagement_bonus, 0) as recommendation_score,
      
      'セマンティック類似性による推薦' as recommendation_reason,
      'embedding_semantic' as embedding_match_type,
      w.created_at
    FROM _internal.work_embeddings_v2 we
    JOIN works w ON w.work_id = we.work_id
    JOIN users u ON u.id = w.user_id
    LEFT JOIN ctr_scores cs ON cs.work_id = w.work_id
    WHERE has_embedding_data = true
      AND we.processing_status = 'completed'
      AND we.title_embedding IS NOT NULL 
      AND we.description_embedding IS NOT NULL
      AND w.is_published = true
      AND w.user_id != p_user_id  -- 自分の作品除外
      AND w.work_id NOT IN (SELECT work_id FROM recently_read)
      AND w.work_id NOT IN (
        SELECT work_id FROM likes WHERE user_id = p_user_id
        UNION
        SELECT work_id FROM bookmarks WHERE user_id = p_user_id
      )
    ORDER BY (1 - (user_embedding_vector <=> we.title_embedding)) DESC
    LIMIT GREATEST(p_limit * 2, 40)  -- エンベディング候補を多めに取得
  ),
  
  -- 従来の協調フィルタリング推薦（エンベディング情報付き）
  collaborative_recommendations AS (
    SELECT 
      cbr.*,
      COALESCE(
        (1 - (user_embedding_vector <=> we.title_embedding)) * 10.0,
        0
      ) as semantic_similarity,
      CASE 
        WHEN we.work_id IS NOT NULL THEN 'collaborative_with_embedding'
        ELSE 'collaborative_only'
      END as embedding_match_type
    FROM (
      -- 既存の協調フィルタリングロジック（簡略化）
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
        5.0 + (COALESCE(w.trend_score, 0) / 100.0) + COALESCE(cs.ctr_bonus, 0) as recommendation_score,
        '人気作品・トレンド' as recommendation_reason,
        w.created_at
      FROM _internal.popular_works_snapshot pws
      JOIN works w ON w.work_id = pws.work_id
      JOIN users u ON u.id = w.user_id
      LEFT JOIN ctr_scores cs ON cs.work_id = w.work_id
      WHERE w.is_published = true
        AND w.user_id != p_user_id
        AND w.work_id NOT IN (SELECT work_id FROM recently_read)
        AND w.work_id NOT IN (
          SELECT work_id FROM likes WHERE user_id = p_user_id
          UNION
          SELECT work_id FROM bookmarks WHERE user_id = p_user_id
        )
      ORDER BY pws.composite_score DESC, w.created_at DESC
      LIMIT GREATEST(p_limit, 20)
    ) cbr
    LEFT JOIN _internal.work_embeddings_v2 we ON we.work_id = cbr.work_id 
      AND we.processing_status = 'completed'
  ),
  
  -- 統合結果
  unified_recommendations AS (
    -- エンベディングベース推薦（利用可能な場合）
    SELECT 
      ebr.work_id, ebr.title, ebr.description, ebr.image_url, ebr.category, ebr.tags,
      ebr.author, ebr.author_username, ebr.views, ebr.likes, ebr.comments,
      ebr.recommendation_score, ebr.recommendation_reason, ebr.created_at,
      ebr.semantic_similarity, ebr.embedding_match_type,
      1 as recommendation_priority
    FROM embedding_based_recommendations ebr
    WHERE has_embedding_data = true
    
    UNION ALL
    
    -- 協調フィルタリング推薦
    SELECT 
      cr.work_id, cr.title, cr.description, cr.image_url, cr.category, cr.tags,
      cr.author, cr.author_username, cr.views, cr.likes, cr.comments,
      cr.recommendation_score, cr.recommendation_reason, cr.created_at,
      cr.semantic_similarity, cr.embedding_match_type,
      2 as recommendation_priority
    FROM collaborative_recommendations cr
  )
  
  SELECT 
    ur.work_id as out_work_id, 
    ur.title as out_title, 
    ur.description as out_description, 
    ur.image_url as out_image_url, 
    ur.category as out_category, 
    ur.tags as out_tags,
    ur.author as out_author, 
    ur.author_username as out_author_username, 
    ur.views as out_views, 
    ur.likes as out_likes, 
    ur.comments as out_comments,
    ur.recommendation_score as out_recommendation_score, 
    ur.recommendation_reason as out_recommendation_reason, 
    ur.created_at as out_created_at,
    ur.semantic_similarity as out_semantic_similarity, 
    ur.embedding_match_type as out_embedding_match_type
  FROM unified_recommendations ur
  ORDER BY 
    recommendation_priority ASC,
    recommendation_score DESC,
    semantic_similarity DESC NULLS LAST,
    created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
  
END;
$$;