-- 作品ページパフォーマンス最適化のためのインデックス
-- 2025-01-17

-- 1. ユーザー×作品の相互作用クエリ最適化
-- いいねテーブル: user_id + work_id の複合インデックス
CREATE INDEX IF NOT EXISTS idx_likes_user_work 
ON likes (user_id, work_id);

-- ブックマークテーブル: user_id + work_id の複合インデックス  
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_work 
ON bookmarks (user_id, work_id);

-- 読書進捗テーブル: user_id + work_id の複合インデックス
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_work 
ON reading_progress (user_id, work_id);

-- 2. 作品詳細取得の最適化
-- works テーブル: work_id + is_published の複合インデックス（公開済み作品の高速検索）
CREATE INDEX IF NOT EXISTS idx_works_id_published 
ON works (work_id, is_published);

-- 3. シリーズ作品検索の最適化
-- works テーブル: series_id + episode_number の複合インデックス
CREATE INDEX IF NOT EXISTS idx_works_series_episode 
ON works (series_id, episode_number) 
WHERE series_id IS NOT NULL;

-- 4. 予約投稿の最適化
-- works テーブル: scheduled_at + is_published の複合インデックス
CREATE INDEX IF NOT EXISTS idx_works_scheduled_published 
ON works (scheduled_at, is_published) 
WHERE scheduled_at IS NOT NULL;

-- 5. 読書履歴取得の最適化
-- reading_progress テーブル: user_id + progress_percentage + updated_at の複合インデックス
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_recent 
ON reading_progress (user_id, updated_at DESC) 
WHERE progress_percentage > 1; -- 1%以上読んだもののみ

-- 6. 統計情報更新の最適化
-- コメント数、いいね数集計のためのインデックス
CREATE INDEX IF NOT EXISTS idx_reviews_work_created 
ON reviews (work_id, created_at);

CREATE INDEX IF NOT EXISTS idx_likes_work_created 
ON likes (work_id, liked_at);

-- 7. ANALYZE でテーブル統計を更新（クエリプランナーの最適化）
ANALYZE likes;
ANALYZE bookmarks; 
ANALYZE reading_progress;
ANALYZE works;
ANALYZE reviews;

-- インデックス作成の確認
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('likes', 'bookmarks', 'reading_progress', 'works', 'reviews')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;