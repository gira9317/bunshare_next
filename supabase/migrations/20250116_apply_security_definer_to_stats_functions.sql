-- ========================================
-- 統計更新関数にSECURITY DEFINER適用 + ユニーク制約追加
-- Date: 2025-01-16
-- Description: RLSをバイパスして統計更新を確実にする
-- ========================================

-- 1. update_work_comments_count関数にSECURITY DEFINER追加
CREATE OR REPLACE FUNCTION "public"."update_work_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- コメント追加
    UPDATE works 
    SET 
      comments_count = comments_count + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- コメント削除
    UPDATE works 
    SET 
      comments_count = GREATEST(0, comments_count - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- コメント更新（通常発生しないが念のため）
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 2. update_work_views_count関数にSECURITY DEFINER追加
CREATE OR REPLACE FUNCTION "public"."update_work_views_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- ビュー追加
    UPDATE works 
    SET 
      views_count = views_count + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- ビュー削除（通常は発生しないが念のため）
    UPDATE works 
    SET 
      views_count = GREATEST(0, views_count - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. update_user_works_count関数にSECURITY DEFINER追加
CREATE OR REPLACE FUNCTION "public"."update_user_works_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published = true THEN
      UPDATE users
      SET works_count = works_count + 1,
          stats_updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_published != NEW.is_published THEN
      UPDATE users
      SET works_count = works_count + CASE 
        WHEN NEW.is_published = true THEN 1 
        ELSE -1 
      END,
          stats_updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_published = true THEN
      UPDATE users
      SET works_count = GREATEST(0, works_count - 1),
          stats_updated_at = NOW()
      WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. update_follow_counts関数にSECURITY DEFINER追加
CREATE OR REPLACE FUNCTION "public"."update_follow_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- フォロワー数を増加
    UPDATE users 
    SET followers_count = followers_count + 1,
        stats_updated_at = NOW()
    WHERE id = NEW.following_id;
    
    -- フォロー数を増加
    UPDATE users 
    SET following_count = following_count + 1,
        stats_updated_at = NOW()
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- フォロワー数を減少
    UPDATE users 
    SET followers_count = GREATEST(0, followers_count - 1),
        stats_updated_at = NOW()
    WHERE id = OLD.following_id;
    
    -- フォロー数を減少
    UPDATE users 
    SET following_count = GREATEST(0, following_count - 1),
        stats_updated_at = NOW()
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 5. ユニーク制約の確認と重複データ処理
-- 既存の制約を確認（すべて既に存在している）:
-- - likes: "likes_user_id_work_id_key" UNIQUE (user_id, work_id)
-- - follows: "follows_follower_id_followed_id_key" UNIQUE (follower_id, followed_id)  
-- - reviews: 制約が未実装の可能性があるため追加
DO $$
BEGIN
  -- reviewsテーブルの重複データを削除してからユニーク制約を追加
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_work_id_key') THEN
    -- 重複したレビューを削除（最新のもの以外を削除）
    DELETE FROM public.reviews r1
    WHERE EXISTS (
      SELECT 1 FROM public.reviews r2
      WHERE r1.user_id = r2.user_id 
        AND r1.work_id = r2.work_id
        AND r1.created_at < r2.created_at
    );
    
    -- ユニーク制約を追加
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_work_id_key UNIQUE (user_id, work_id);
  END IF;
END
$$;

-- views_logテーブル: 同じユーザーが同じ作品を同時刻に複数回閲覧記録されないようにする
-- （ただし、views_logは履歴なので重複を許可する場合もある）
-- ALTER TABLE public.views_log 
-- ADD CONSTRAINT IF NOT EXISTS unique_user_work_view_timestamp 
-- UNIQUE (user_id, work_id, created_at);