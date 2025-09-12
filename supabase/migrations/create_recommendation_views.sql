-- 推薦システム用のマテリアライズドビューとインデックス

-- ユーザー嗜好キャッシュビュー
CREATE MATERIALIZED VIEW user_preferences_cache AS
SELECT 
  user_id,
  ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL) as preferred_categories,
  ARRAY_AGG(DISTINCT tag) FILTER (WHERE tag IS NOT NULL) as preferred_tags,
  SUM(interaction_weight) as total_behavior_score,
  MAX(last_interaction) as last_updated
FROM (
  -- いいね履歴から嗜好抽出
  SELECT 
    l.user_id,
    w.category,
    unnest(w.tags) as tag,
    15 as interaction_weight,  -- いいね重み
    l.liked_at as last_interaction
  FROM likes l
  JOIN works w ON w.work_id = l.work_id
  WHERE l.liked_at > NOW() - INTERVAL '90 days'
  
  UNION ALL
  
  -- ブックマーク履歴から嗜好抽出  
  SELECT 
    b.user_id,
    w.category,
    unnest(w.tags) as tag,
    20 as interaction_weight,  -- ブックマーク重み（最高）
    b.bookmarked_at as last_interaction
  FROM bookmarks b
  JOIN works w ON w.work_id = b.work_id
  WHERE b.bookmarked_at > NOW() - INTERVAL '90 days'
  
  UNION ALL
  
  -- レビュー履歴から嗜好抽出
  SELECT 
    r.user_id,
    w.category,
    unnest(w.tags) as tag,
    12 as interaction_weight,  -- レビュー重み
    r.created_at as last_interaction
  FROM reviews r
  JOIN works w ON w.work_id = r.work_id
  WHERE r.created_at > NOW() - INTERVAL '90 days'
  
  UNION ALL
  
  -- 閲覧履歴から嗜好抽出（リピート閲覧のみ）
  SELECT 
    v.user_id,
    w.category,
    unnest(w.tags) as tag,
    view_count * 2 as interaction_weight,  -- 閲覧回数 * 2
    MAX(v.viewed_at) as last_interaction
  FROM (
    SELECT user_id, work_id, COUNT(*) as view_count, MAX(viewed_at) as viewed_at
    FROM views_log 
    WHERE viewed_at > NOW() - INTERVAL '90 days'
    GROUP BY user_id, work_id
    HAVING COUNT(*) >= 2  -- 2回以上閲覧のみ
  ) v
  JOIN works w ON w.work_id = v.work_id
  GROUP BY v.user_id, w.category, unnest(w.tags), view_count
) user_interactions
GROUP BY user_id;

-- インデックス作成
CREATE UNIQUE INDEX idx_user_preferences_cache_user_id 
ON user_preferences_cache (user_id);

CREATE INDEX idx_user_preferences_cache_behavior_score 
ON user_preferences_cache (total_behavior_score DESC);

-- 人気作品スナップショットビュー
CREATE MATERIALIZED VIEW popular_works_snapshot AS
WITH work_stats AS (
  SELECT 
    w.work_id,
    w.title,
    w.description,
    w.image_url,
    w.category,
    w.tags,
    w.user_id,
    w.created_at,
    COALESCE(w.views_count, 0) as views,
    COALESCE(w.likes_count, 0) as likes,
    COALESCE(w.comments_count, 0) as comments,
    COALESCE(w.trend_score, 0) as trend_score,
    -- 最近の活動度（直近7日）
    COALESCE((
      SELECT COUNT(*) FROM likes l 
      WHERE l.work_id = w.work_id AND l.liked_at > NOW() - INTERVAL '7 days'
    ), 0) as recent_likes,
    COALESCE((
      SELECT COUNT(*) FROM views_log v 
      WHERE v.work_id = w.work_id AND v.viewed_at > NOW() - INTERVAL '7 days'
    ), 0) as recent_views,
    -- 総合人気スコア算出
    (
      COALESCE(w.trend_score, 0) * 0.4 +
      COALESCE(w.likes_count, 0) * 0.3 +
      COALESCE(w.views_count, 0) / 10.0 * 0.2 +
      COALESCE((
        SELECT COUNT(*) FROM likes l 
        WHERE l.work_id = w.work_id AND l.liked_at > NOW() - INTERVAL '7 days'
      ), 0) * 0.1
    ) as popularity_score
  FROM works w
  WHERE w.is_published = true
)
SELECT 
  ws.*,
  u.username as author,
  u.username as author_username,
  ROW_NUMBER() OVER (ORDER BY ws.popularity_score DESC, ws.created_at DESC) as popularity_rank,
  NOW() as snapshot_created_at
FROM work_stats ws
JOIN users u ON u.id = ws.user_id
ORDER BY ws.popularity_score DESC;

-- インデックス作成
CREATE UNIQUE INDEX idx_popular_works_work_id 
ON popular_works_snapshot (work_id);

CREATE INDEX idx_popular_works_popularity_rank 
ON popular_works_snapshot (popularity_rank);

CREATE INDEX idx_popular_works_category 
ON popular_works_snapshot (category);

CREATE INDEX idx_popular_works_tags 
ON popular_works_snapshot USING GIN (tags);

-- 類似ユーザーマトリックスビュー（協調フィルタリング用）
CREATE MATERIALIZED VIEW user_similarity_matrix AS
WITH user_interactions AS (
  SELECT user_id, work_id, 'like' as interaction_type, 3 as weight FROM likes
  UNION ALL
  SELECT user_id, work_id, 'bookmark' as interaction_type, 4 as weight FROM bookmarks
  UNION ALL
  SELECT user_id, work_id, 'review' as interaction_type, 2 as weight FROM reviews
),
user_pairs AS (
  SELECT 
    u1.user_id as user1_id,
    u2.user_id as user2_id,
    COUNT(DISTINCT u1.work_id) as common_works,
    SUM(u1.weight + u2.weight) as interaction_strength,
    -- Jaccard類似度計算
    COUNT(DISTINCT u1.work_id) * 1.0 / NULLIF(
      (SELECT COUNT(DISTINCT work_id) FROM user_interactions WHERE user_id = u1.user_id) +
      (SELECT COUNT(DISTINCT work_id) FROM user_interactions WHERE user_id = u2.user_id) -
      COUNT(DISTINCT u1.work_id), 0
    ) as jaccard_similarity
  FROM user_interactions u1
  JOIN user_interactions u2 ON u1.work_id = u2.work_id AND u1.user_id < u2.user_id
  GROUP BY u1.user_id, u2.user_id
  HAVING COUNT(DISTINCT u1.work_id) >= 3  -- 最低3作品の共通点が必要
)
SELECT 
  user1_id,
  user2_id,
  common_works,
  interaction_strength,
  jaccard_similarity,
  CASE 
    WHEN jaccard_similarity >= 0.3 THEN 'high'
    WHEN jaccard_similarity >= 0.1 THEN 'medium'
    ELSE 'low'
  END as similarity_level,
  NOW() as calculated_at
FROM user_pairs
WHERE jaccard_similarity > 0.05;  -- 最低限の類似度フィルタ

-- インデックス作成
CREATE INDEX idx_user_similarity_user1 
ON user_similarity_matrix (user1_id, jaccard_similarity DESC);

CREATE INDEX idx_user_similarity_user2 
ON user_similarity_matrix (user2_id, jaccard_similarity DESC);

CREATE INDEX idx_user_similarity_level 
ON user_similarity_matrix (similarity_level);

-- 推薦結果キャッシュテーブル（オプション）
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  work_id UUID NOT NULL,
  recommendation_score DECIMAL(5,2) NOT NULL,
  recommendation_reason TEXT,
  strategy TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '6 hours',
  
  CONSTRAINT fk_recommendation_cache_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recommendation_cache_work FOREIGN KEY (work_id) REFERENCES works(work_id) ON DELETE CASCADE
);

-- 推薦キャッシュのインデックス
CREATE INDEX idx_recommendation_cache_user_id 
ON recommendation_cache (user_id, expires_at DESC);

-- 有効な推薦キャッシュ用インデックス（述語なしでシンプルに）
CREATE INDEX idx_recommendation_cache_score 
ON recommendation_cache (user_id, recommendation_score DESC, expires_at);

-- 期限切れレコード自動削除用インデックス（述語なしでシンプルに）
CREATE INDEX idx_recommendation_cache_expires 
ON recommendation_cache (expires_at);

-- 有効な推薦キャッシュを取得する関数
CREATE OR REPLACE FUNCTION get_valid_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  work_id UUID,
  recommendation_score DECIMAL(5,2),
  recommendation_reason TEXT,
  strategy TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    rc.work_id,
    rc.recommendation_score,
    rc.recommendation_reason,
    rc.strategy
  FROM recommendation_cache rc
  WHERE rc.user_id = p_user_id 
    AND rc.expires_at > NOW()
  ORDER BY rc.recommendation_score DESC
  LIMIT p_limit;
$$;

-- 統計情報更新関数
CREATE OR REPLACE FUNCTION refresh_recommendation_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- マテリアライズドビューを並行更新
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_preferences_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_works_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity_matrix;
  
  -- 期限切れ推薦キャッシュを削除
  DELETE FROM recommendation_cache WHERE expires_at <= NOW();
  
  RAISE NOTICE '推薦キャッシュの更新が完了しました';
END;
$$;

-- 推薦統計関数
CREATE OR REPLACE FUNCTION get_recommendation_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_users_with_preferences', (SELECT COUNT(*) FROM user_preferences_cache),
    'total_popular_works', (SELECT COUNT(*) FROM popular_works_snapshot),
    'total_user_similarities', (SELECT COUNT(*) FROM user_similarity_matrix),
    'cached_recommendations', (SELECT COUNT(*) FROM recommendation_cache WHERE expires_at > NOW()),
    'last_cache_refresh', (SELECT MAX(snapshot_created_at) FROM popular_works_snapshot)
  ) INTO stats;
  
  RETURN stats;
END;
$$;