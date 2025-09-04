-- パフォーマンス最適化用インデックス
-- ホームページ・作品フィード高速化のため

-- 1. works テーブル - 公開済み作品の作成日順検索最適化
CREATE INDEX IF NOT EXISTS idx_works_published_created_at 
ON public.works (is_published, created_at DESC) 
WHERE is_published = true;

-- 2. works テーブル - カテゴリ別公開作品検索最適化  
CREATE INDEX IF NOT EXISTS idx_works_category_published_created_at 
ON public.works (category, is_published, created_at DESC) 
WHERE is_published = true;

-- 3. likes テーブル - ユーザーのいいね状態高速取得（既存確認）
-- この複合インデックスは既に存在する可能性があるためIF NOT EXISTSで安全に実行
CREATE INDEX IF NOT EXISTS idx_likes_user_work 
ON public.likes (user_id, work_id);

-- 4. bookmarks テーブル - ユーザーのブックマーク状態高速取得の最適化
-- 既存のインデックスを確認して必要に応じて追加
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_work_optimized 
ON public.bookmarks (user_id, work_id, bookmarked_at DESC);

-- 5. users テーブル - 作者情報取得最適化
CREATE INDEX IF NOT EXISTS idx_users_id_username 
ON public.users (id) INCLUDE (username);

-- 6. series テーブル - シリーズ情報取得最適化
CREATE INDEX IF NOT EXISTS idx_series_id_title 
ON public.series (id) INCLUDE (title);

-- 7. reading_bookmarks テーブル - 続きから読む機能最適化
CREATE INDEX IF NOT EXISTS idx_reading_bookmarks_user_updated 
ON public.reading_bookmarks (user_id, updated_at DESC);