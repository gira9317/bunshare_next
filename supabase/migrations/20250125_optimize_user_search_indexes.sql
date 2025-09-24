-- ========================================
-- ユーザー検索パフォーマンス最適化
-- ========================================

-- pg_trgm 拡張を有効化（トライグラム検索用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. following_count用インデックス（不足していた）
CREATE INDEX IF NOT EXISTS idx_users_following_count 
ON users (following_count DESC NULLS LAST);

-- 2. トライグラム検索用インデックス（ILIKE %text% 高速化）
CREATE INDEX IF NOT EXISTS idx_users_username_trgm 
ON users USING gin (username gin_trgm_ops)
WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_custom_user_id_trgm 
ON users USING gin (custom_user_id gin_trgm_ops)
WHERE custom_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_bio_trgm 
ON users USING gin (bio gin_trgm_ops)
WHERE bio IS NOT NULL;

-- 3. 全文検索用GINインデックス（複合検索の高速化）
CREATE INDEX IF NOT EXISTS idx_users_search_fulltext 
ON users USING gin(
  to_tsvector('simple', 
    coalesce(username, '') || ' ' || 
    coalesce(custom_user_id, '') || ' ' || 
    coalesce(bio, '')
  )
)
WHERE username IS NOT NULL OR custom_user_id IS NOT NULL OR bio IS NOT NULL;

-- 4. 複合インデックス（検索 + ソート最適化）
-- フォロワー数順でよく検索される場合
CREATE INDEX IF NOT EXISTS idx_users_search_followers_composite 
ON users (followers_count DESC NULLS LAST, username)
WHERE username IS NOT NULL OR custom_user_id IS NOT NULL;

-- 作品数順でよく検索される場合
CREATE INDEX IF NOT EXISTS idx_users_search_works_composite 
ON users (works_count DESC NULLS LAST, username)
WHERE username IS NOT NULL OR custom_user_id IS NOT NULL;

-- フォロー数順でよく検索される場合  
CREATE INDEX IF NOT EXISTS idx_users_search_following_composite 
ON users (following_count DESC NULLS LAST, username)
WHERE username IS NOT NULL OR custom_user_id IS NOT NULL;

-- 5. 統計カラムのNULL値を0にデフォルト設定（パフォーマンス向上）
UPDATE users 
SET works_count = 0 
WHERE works_count IS NULL;

UPDATE users 
SET followers_count = 0 
WHERE followers_count IS NULL;

UPDATE users 
SET following_count = 0 
WHERE following_count IS NULL;

-- 6. デフォルト値設定（今後のNULL防止）
ALTER TABLE users 
ALTER COLUMN works_count SET DEFAULT 0;

ALTER TABLE users 
ALTER COLUMN followers_count SET DEFAULT 0;

ALTER TABLE users 
ALTER COLUMN following_count SET DEFAULT 0;

-- 7. NOT NULL制約追加（可能な場合）
-- 既存データが0になったので安全に追加可能
ALTER TABLE users 
ALTER COLUMN works_count SET NOT NULL;

ALTER TABLE users 
ALTER COLUMN followers_count SET NOT NULL;

ALTER TABLE users 
ALTER COLUMN following_count SET NOT NULL;

-- ========================================
-- テーブル統計情報を更新（クエリプランナー最適化）
-- ========================================
ANALYZE users;

-- ========================================
-- インデックス作成完了メッセージ
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ ユーザー検索インデックス最適化完了';
  RAISE NOTICE '📊 トライグラム検索用インデックス: 作成完了';
  RAISE NOTICE '🔍 全文検索用GINインデックス: 作成完了';  
  RAISE NOTICE '⚡ 複合インデックス（検索+ソート）: 作成完了';
  RAISE NOTICE '🎯 統計カラム正規化: 完了';
END $$;