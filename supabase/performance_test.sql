-- 作品ページクエリのパフォーマンステスト
-- インデックス最適化前後の比較用

-- 1. 作品詳細取得のパフォーマンステスト
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    work_id, title, content, description, category, tags,
    views_count, likes_count, comments_count,
    is_published, scheduled_at, created_at, updated_at,
    series_id, episode_number, image_url, use_series_image
FROM works 
WHERE work_id = 'test-work-id-here';

-- 2. ユーザー相互作用状態の統合クエリテスト  
EXPLAIN (ANALYZE, BUFFERS)
WITH user_states AS (
    SELECT 
        'test-user-id-here' as user_id,
        'test-work-id-here' as work_id
), 
like_check AS (
    SELECT EXISTS(
        SELECT 1 FROM likes l, user_states u 
        WHERE l.user_id = u.user_id AND l.work_id = u.work_id
    ) as is_liked
),
bookmark_check AS (
    SELECT EXISTS(
        SELECT 1 FROM bookmarks b, user_states u
        WHERE b.user_id = u.user_id AND b.work_id = u.work_id  
    ) as is_bookmarked
),
progress_check AS (
    SELECT COALESCE(rp.progress, 0) as reading_progress
    FROM user_states u
    LEFT JOIN reading_progress rp ON rp.user_id = u.user_id AND rp.work_id = u.work_id
)
SELECT 
    (SELECT is_liked FROM like_check),
    (SELECT is_bookmarked FROM bookmark_check), 
    (SELECT reading_progress FROM progress_check);

-- 3. シリーズ作品取得のパフォーマンステスト
EXPLAIN (ANALYZE, BUFFERS)
SELECT work_id, title, episode_number
FROM works 
WHERE series_id = 'test-series-id-here'
ORDER BY episode_number ASC;

-- 4. 読書履歴取得のパフォーマンステスト
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    rp.work_id,
    rp.progress,
    rp.updated_at,
    w.title,
    w.image_url,
    u.username as author
FROM reading_progress rp
JOIN works w ON w.work_id = rp.work_id
JOIN users u ON u.id = w.user_id
WHERE rp.user_id = 'test-user-id-here'
    AND rp.progress > 0.01
    AND w.is_published = true
ORDER BY rp.updated_at DESC
LIMIT 6;

-- 5. 現在のインデックス使用状況を確認
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('likes', 'bookmarks', 'reading_progress', 'works')
ORDER BY tablename, attname;

-- 6. クエリプランとコストの確認
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements 
WHERE query LIKE '%works%' 
    OR query LIKE '%likes%'
    OR query LIKE '%bookmarks%'
    OR query LIKE '%reading_progress%'
ORDER BY total_time DESC
LIMIT 10;