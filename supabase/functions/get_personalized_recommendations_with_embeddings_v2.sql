-- エンベディングベース推薦を含む個人化推薦システム（簡略版）
-- 曖昧性エラーを回避するため、従来の推薦システムを拡張する形で実装

CREATE OR REPLACE FUNCTION get_personalized_recommendations_with_embeddings(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_embedding_weight DECIMAL DEFAULT 0.3
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
  created_at TIMESTAMPTZ,
  semantic_similarity DECIMAL(5,2),
  embedding_match_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, _internal
AS $$
BEGIN
  -- エンベディングデータが不足している場合は従来の推薦にフォールバック
  IF NOT EXISTS (
    SELECT 1 FROM _internal.work_embeddings_v2 
    WHERE processing_status = 'completed' 
    LIMIT 1
  ) THEN
    -- 従来の推薦関数を呼び出し、エンベディング関連フィールドはNULLで返す
    RETURN QUERY
    SELECT 
      r.work_id,
      r.title,
      r.description,
      r.image_url,
      r.category,
      r.tags,
      r.author,
      r.author_username,
      r.views,
      r.likes,
      r.comments,
      r.recommendation_score,
      r.recommendation_reason,
      r.created_at,
      NULL::DECIMAL(5,2) as semantic_similarity,
      'no_embedding'::TEXT as embedding_match_type
    FROM get_personalized_recommendations(p_user_id, p_limit, p_offset) r;
    RETURN;
  END IF;

  -- エンベディングベース推薦の実装
  RETURN QUERY
  WITH user_preferences AS (
    -- ユーザーの嗜好作品を取得（過去30日）
    SELECT DISTINCT w.work_id
    FROM works w
    JOIN likes l ON l.work_id = w.work_id 
    WHERE l.user_id = p_user_id 
      AND l.liked_at > NOW() - INTERVAL '30 days'
    LIMIT 10  -- 計算コストを削減
  ),
  
  -- エンベディングベースの類似作品を取得
  embedding_recommendations AS (
    SELECT DISTINCT ON (w.work_id)
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
      -- エンベディング類似度スコア
      (5.0 + (1 - MIN(we1.title_embedding <=> we2.title_embedding)) * 5.0)::DECIMAL(5,2) as recommendation_score,
      'セマンティック類似性による推薦' as recommendation_reason,
      w.created_at,
      ((1 - MIN(we1.title_embedding <=> we2.title_embedding)) * 10.0)::DECIMAL(5,2) as semantic_similarity,
      'embedding_based' as embedding_match_type
    FROM user_preferences up
    JOIN _internal.work_embeddings_v2 we1 ON we1.work_id = up.work_id
      AND we1.processing_status = 'completed'
      AND we1.title_embedding IS NOT NULL
    CROSS JOIN _internal.work_embeddings_v2 we2
    JOIN works w ON w.work_id = we2.work_id
    JOIN users u ON u.id = w.user_id
    WHERE we2.processing_status = 'completed'
      AND we2.title_embedding IS NOT NULL
      AND we2.work_id != up.work_id  -- 既に読んだ作品を除外
      AND w.is_published = true
      AND w.user_id != p_user_id  -- 自分の作品を除外
      AND NOT EXISTS (
        SELECT 1 FROM likes WHERE user_id = p_user_id AND likes.work_id = w.work_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM bookmarks WHERE user_id = p_user_id AND bookmarks.work_id = w.work_id
      )
    GROUP BY w.work_id, w.title, w.description, w.image_url, w.category, 
             w.tags, u.username, w.views_count, w.likes_count, w.comments_count, w.created_at
    ORDER BY w.work_id, recommendation_score DESC
  ),
  
  -- 従来の推薦も取得
  traditional_recommendations AS (
    SELECT 
      r.work_id,
      r.title,
      r.description,
      r.image_url,
      r.category,
      r.tags,
      r.author,
      r.author_username,
      r.views,
      r.likes,
      r.comments,
      r.recommendation_score,
      r.recommendation_reason,
      r.created_at,
      0.0::DECIMAL(5,2) as semantic_similarity,
      'traditional' as embedding_match_type
    FROM get_personalized_recommendations(p_user_id, p_limit * 2, p_offset) r
  ),
  
  -- 統合結果（従来の推薦とエンベディング推薦をバランス良く混合）
  combined_results AS (
    -- エンベディング推薦（上位のみ、重み付けを適用）
    SELECT 
      work_id,
      title,
      description,
      image_url,
      category,
      tags,
      author,
      author_username,
      views,
      likes,
      comments,
      -- エンベディング推薦のスコアに重み付けを適用
      (recommendation_score * p_embedding_weight)::DECIMAL(5,2) as recommendation_score,
      recommendation_reason,
      created_at,
      semantic_similarity,
      embedding_match_type
    FROM (
      SELECT * FROM embedding_recommendations er
      WHERE er.semantic_similarity > 5.0  -- より厳しい閾値
      ORDER BY er.semantic_similarity DESC
      LIMIT GREATEST(1, (p_limit * p_embedding_weight)::INTEGER)  -- 重み付けに応じた件数制限
    ) er_filtered
    
    UNION ALL
    
    -- 従来の推薦（重み付けを適用）
    SELECT 
      work_id,
      title,
      description,
      image_url,
      category,
      tags,
      author,
      author_username,
      views,
      likes,
      comments,
      -- 従来推薦のスコアに逆重み付けを適用
      (recommendation_score * (1 - p_embedding_weight))::DECIMAL(5,2) as recommendation_score,
      recommendation_reason,
      created_at,
      semantic_similarity,
      embedding_match_type
    FROM traditional_recommendations tr
    WHERE tr.work_id NOT IN (
      SELECT er2.work_id FROM embedding_recommendations er2
      WHERE er2.semantic_similarity > 5.0
    )
  )
  
  SELECT * FROM combined_results cr
  ORDER BY 
    cr.recommendation_score DESC  -- スコアのみで並び替え（重み付け済み）
  LIMIT p_limit
  OFFSET p_offset;
  
END;
$$;