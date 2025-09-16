-- ========================================
-- Migration: likes_countからlikesへの統一
-- Date: 2025-01-16
-- Description: いいね機能の修正 - likes_countカラムをlikesカラムに統一
-- ========================================

-- ========================================
-- Step 1: データの同期（likes_countの値をlikesにコピー）
-- ========================================
UPDATE works 
SET likes = COALESCE(likes_count, 0)
WHERE likes IS NULL OR likes != likes_count;

-- ========================================
-- Step 2: トリガー関数の修正
-- ========================================
CREATE OR REPLACE FUNCTION "public"."update_work_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- いいね追加
    UPDATE works 
    SET 
      likes = likes + 1,  -- likes_countではなくlikesを更新
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- いいね削除
    UPDATE works 
    SET 
      likes = GREATEST(0, likes - 1),  -- likes_countではなくlikesを更新
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ========================================
-- Step 3: ビューの修正
-- ========================================
CREATE OR REPLACE VIEW "public"."work_popularity_view" AS
SELECT 
    w.work_id,
    w.title,
    w.user_id,
    w.created_at,
    COALESCE(w.views_count, 0::bigint) AS views,
    COALESCE(w.likes, 0) AS likes,  -- likes_countをlikesに変更
    COALESCE(w.comments_count, 0) AS comments,
    COALESCE(w.trend_score, 0::numeric) AS trend_score,
    COALESCE((SELECT count(*) FROM public.likes l WHERE l.work_id = w.work_id), 0::bigint) AS actual_likes,
    COALESCE((SELECT count(*) FROM public.views_log v WHERE v.work_id = w.work_id AND v.viewed_at > (now() - '7 days'::interval)), 0::bigint) AS recent_views,
    ((((COALESCE(w.trend_score, 0::numeric) * 0.4) + 
      ((COALESCE(w.likes, 0))::numeric * 0.3)) +  -- likes_countをlikesに変更
      (((COALESCE(w.views_count, 0::bigint))::numeric / 10.0) * 0.2)) + 
      ((COALESCE((SELECT count(*) FROM public.likes l WHERE l.work_id = w.work_id AND l.liked_at > (now() - '7 days'::interval)), 0::bigint))::numeric * 0.1)) AS popularity_score
FROM public.works w
WHERE w.is_published = true;

-- ========================================
-- Step 4: インデックスの再作成
-- ========================================
DROP INDEX IF EXISTS idx_works_likes_count;
CREATE INDEX IF NOT EXISTS idx_works_likes ON public.works USING btree (likes DESC);

-- ========================================
-- Step 5: 推薦システム関数の修正
-- ========================================

-- Note: 以下の関数も修正が必要ですが、関数が大きいため個別に修正してください
-- - get_personalized_recommendations_with_embeddings
-- - get_personalized_strategy  
-- - get_popular_strategy
-- - get_simple_personalized
-- - get_simple_popular
--
-- 修正内容: すべての COALESCE(w.likes_count, 0) を COALESCE(w.likes, 0) に変更
--          または COALESCE(w5.likes_count, 0) → COALESCE(w5.likes, 0) など

-- ========================================
-- Optional: likes_countカラムの削除（動作確認後に実行）
-- ========================================
-- ALTER TABLE works DROP COLUMN likes_count;