-- マテリアライズドビューにSECURITY INVOKERを追加

-- 1. popular_works_snapshot を再作成
DROP MATERIALIZED VIEW IF EXISTS public.popular_works_snapshot;

CREATE MATERIALIZED VIEW public.popular_works_snapshot 
WITH (security_invoker = true) AS
WITH
  work_stats as (
    SELECT
      w.work_id,
      w.title,
      w.description,
      w.image_url,
      w.category,
      w.tags,
      w.user_id,
      w.created_at,
      COALESCE(w.views_count, 0::bigint) as views,
      COALESCE(w.likes_count, 0) as likes,
      COALESCE(w.comments_count, 0) as comments,
      COALESCE(w.trend_score, 0::numeric) as trend_score,
      COALESCE(
        (
          SELECT count(*) as count
          FROM likes l
          WHERE l.work_id = w.work_id
            AND l.liked_at > (now() - '7 days'::interval)
        ),
        0::bigint
      ) as recent_likes,
      COALESCE(
        (
          SELECT count(*) as count
          FROM views_log v
          WHERE v.work_id = w.work_id
            AND v.viewed_at > (now() - '7 days'::interval)
        ),
        0::bigint
      ) as recent_views,
      COALESCE(w.trend_score, 0::numeric) * 0.4 + 
      COALESCE(w.likes_count, 0)::numeric * 0.3 + 
      COALESCE(w.views_count, 0::bigint)::numeric / 10.0 * 0.2 + 
      COALESCE(
        (
          SELECT count(*) as count
          FROM likes l
          WHERE l.work_id = w.work_id
            AND l.liked_at > (now() - '7 days'::interval)
        ),
        0::bigint
      )::numeric * 0.1 as popularity_score
    FROM works w
    WHERE w.is_published = true
  )
SELECT
  ws.work_id,
  ws.title,
  ws.description,
  ws.image_url,
  ws.category,
  ws.tags,
  ws.user_id,
  ws.created_at,
  ws.views,
  ws.likes,
  ws.comments,
  ws.trend_score,
  ws.recent_likes,
  ws.recent_views,
  ws.popularity_score,
  u.username as author,
  u.username as author_username,
  row_number() OVER (
    ORDER BY ws.popularity_score DESC, ws.created_at DESC
  ) as popularity_rank,
  now() as snapshot_created_at
FROM work_stats ws
JOIN users u ON u.id = ws.user_id
ORDER BY ws.popularity_score DESC;

-- インデックス再作成
CREATE UNIQUE INDEX idx_popular_works_work_id ON popular_works_snapshot (work_id);
CREATE INDEX idx_popular_works_popularity_rank ON popular_works_snapshot (popularity_rank);
CREATE INDEX idx_popular_works_category ON popular_works_snapshot (category);
CREATE INDEX idx_popular_works_tags ON popular_works_snapshot USING GIN (tags);

-- 2. user_preferences_cache を再作成
DROP MATERIALIZED VIEW IF EXISTS public.user_preferences_cache;

CREATE MATERIALIZED VIEW public.user_preferences_cache 
WITH (security_invoker = true) AS
SELECT
  user_id,
  array_agg(DISTINCT category) FILTER (WHERE category IS NOT NULL) as preferred_categories,
  array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL) as preferred_tags,
  sum(interaction_weight) as total_behavior_score,
  max(last_interaction) as last_updated
FROM (
  SELECT
    l.user_id,
    w.category,
    unnest(w.tags) as tag,
    15 as interaction_weight,
    l.liked_at as last_interaction
  FROM likes l
  JOIN works w ON w.work_id = l.work_id
  WHERE l.liked_at > (now() - '90 days'::interval)
  
  UNION ALL
  
  SELECT
    b.user_id,
    w.category,
    unnest(w.tags) as tag,
    20 as interaction_weight,
    b.bookmarked_at as last_interaction
  FROM bookmarks b
  JOIN works w ON w.work_id = b.work_id
  WHERE b.bookmarked_at > (now() - '90 days'::interval)
  
  UNION ALL
  
  SELECT
    r.user_id,
    w.category,
    unnest(w.tags) as tag,
    12 as interaction_weight,
    r.created_at as last_interaction
  FROM reviews r
  JOIN works w ON w.work_id = r.work_id
  WHERE r.created_at > (now() - '90 days'::interval)
  
  UNION ALL
  
  SELECT
    v.user_id,
    w.category,
    unnest(w.tags) as tag,
    v.view_count * 2 as interaction_weight,
    max(v.viewed_at) as last_interaction
  FROM (
    SELECT
      views_log.user_id,
      views_log.work_id,
      count(*) as view_count,
      max(views_log.viewed_at) as viewed_at
    FROM views_log
    WHERE views_log.viewed_at > (now() - '90 days'::interval)
    GROUP BY views_log.user_id, views_log.work_id
    HAVING count(*) >= 2
  ) v
  JOIN works w ON w.work_id = v.work_id
  GROUP BY v.user_id, w.category, unnest(w.tags), v.view_count
) user_interactions
GROUP BY user_id;

-- インデックス再作成
CREATE UNIQUE INDEX idx_user_preferences_cache_user_id ON user_preferences_cache (user_id);
CREATE INDEX idx_user_preferences_cache_behavior_score ON user_preferences_cache (total_behavior_score DESC);

-- 3. user_similarity_matrix を再作成
DROP MATERIALIZED VIEW IF EXISTS public.user_similarity_matrix;

CREATE MATERIALIZED VIEW public.user_similarity_matrix 
WITH (security_invoker = true) AS
WITH
  user_interactions as (
    SELECT
      likes.user_id,
      likes.work_id,
      'like'::text as interaction_type,
      3 as weight
    FROM likes
    
    UNION ALL
    
    SELECT
      bookmarks.user_id,
      bookmarks.work_id,
      'bookmark'::text as interaction_type,
      4 as weight
    FROM bookmarks
    
    UNION ALL
    
    SELECT
      reviews.user_id,
      reviews.work_id,
      'review'::text as interaction_type,
      2 as weight
    FROM reviews
  ),
  user_pairs as (
    SELECT
      u1.user_id as user1_id,
      u2.user_id as user2_id,
      count(DISTINCT u1.work_id) as common_works,
      sum(u1.weight + u2.weight) as interaction_strength,
      count(DISTINCT u1.work_id)::numeric * 1.0 / NULLIF(
        (
          (SELECT count(DISTINCT user_interactions.work_id) as count
           FROM user_interactions
           WHERE user_interactions.user_id = u1.user_id)
        ) + (
          (SELECT count(DISTINCT user_interactions.work_id) as count
           FROM user_interactions
           WHERE user_interactions.user_id = u2.user_id)
        ) - count(DISTINCT u1.work_id),
        0
      )::numeric as jaccard_similarity
    FROM user_interactions u1
    JOIN user_interactions u2 ON u1.work_id = u2.work_id AND u1.user_id < u2.user_id
    GROUP BY u1.user_id, u2.user_id
    HAVING count(DISTINCT u1.work_id) >= 3
  )
SELECT
  user1_id,
  user2_id,
  common_works,
  interaction_strength,
  jaccard_similarity,
  CASE
    WHEN jaccard_similarity >= 0.3 THEN 'high'::text
    WHEN jaccard_similarity >= 0.1 THEN 'medium'::text
    ELSE 'low'::text
  END as similarity_level,
  now() as calculated_at
FROM user_pairs
WHERE jaccard_similarity > 0.05;

-- インデックス再作成
CREATE INDEX idx_user_similarity_user1 ON user_similarity_matrix (user1_id, jaccard_similarity DESC);
CREATE INDEX idx_user_similarity_user2 ON user_similarity_matrix (user2_id, jaccard_similarity DESC);
CREATE INDEX idx_user_similarity_level ON user_similarity_matrix (similarity_level);

-- 権限設定（必要に応じて）
-- GRANT SELECT ON popular_works_snapshot TO authenticated;
-- GRANT SELECT ON user_preferences_cache TO authenticated;
-- GRANT SELECT ON user_similarity_matrix TO authenticated;