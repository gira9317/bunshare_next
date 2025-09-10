-- worksテーブルに集計統計カラムを追加（既存のカラムもあるが念のため）
ALTER TABLE works ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;
ALTER TABLE works ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;
ALTER TABLE works ADD COLUMN IF NOT EXISTS views_count bigint DEFAULT 0;
ALTER TABLE works ADD COLUMN IF NOT EXISTS stats_last_updated timestamp with time zone DEFAULT now();

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_works_likes_count ON works(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_works_comments_count ON works(comments_count DESC);
CREATE INDEX IF NOT EXISTS idx_works_views_count ON works(views_count DESC);

-- likesテーブル変更時のトリガー関数
CREATE OR REPLACE FUNCTION update_work_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- いいね追加
    UPDATE works 
    SET 
      likes_count = likes_count + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- いいね削除
    UPDATE works 
    SET 
      likes_count = GREATEST(0, likes_count - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- commentsテーブル変更時のトリガー関数（将来のコメント機能用）
CREATE OR REPLACE FUNCTION update_work_comments_count()
RETURNS TRIGGER AS $$
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
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- views_logテーブル変更時のトリガー関数
CREATE OR REPLACE FUNCTION update_work_views_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 既存のトリガーを削除して新しいトリガーを作成
DROP TRIGGER IF EXISTS trigger_likes_insert ON likes;
DROP TRIGGER IF EXISTS trigger_likes_delete ON likes;

CREATE TRIGGER trigger_update_work_likes_insert
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_work_likes_count();

CREATE TRIGGER trigger_update_work_likes_delete
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_work_likes_count();

-- views_logのトリガー（既存のものと重複しないようチェック）
DROP TRIGGER IF EXISTS trigger_update_work_views_insert ON views_log;
DROP TRIGGER IF EXISTS trigger_update_work_views_delete ON views_log;

CREATE TRIGGER trigger_update_work_views_insert
  AFTER INSERT ON views_log
  FOR EACH ROW
  EXECUTE FUNCTION update_work_views_count();

CREATE TRIGGER trigger_update_work_views_delete
  AFTER DELETE ON views_log
  FOR EACH ROW
  EXECUTE FUNCTION update_work_views_count();

-- コメント機能実装時用のトリガー（コメントテーブルが存在する場合）
-- CREATE TRIGGER trigger_update_work_comments_insert
--   AFTER INSERT ON comments
--   FOR EACH ROW
--   EXECUTE FUNCTION update_work_comments_count();
--
-- CREATE TRIGGER trigger_update_work_comments_delete
--   AFTER DELETE ON comments
--   FOR EACH ROW
--   EXECUTE FUNCTION update_work_comments_count();

-- 既存データの初期化
DO $$
DECLARE
  work_record RECORD;
  likes_cnt integer;
  comments_cnt integer;
  views_cnt bigint;
BEGIN
  FOR work_record IN SELECT work_id FROM works WHERE is_published = true LOOP
    -- いいね数を集計
    SELECT COUNT(*) INTO likes_cnt
    FROM likes 
    WHERE work_id = work_record.work_id;
    
    -- コメント数を集計（将来のコメント機能用）
    comments_cnt := 0; -- 現在はコメント機能なしなので0
    
    -- ビュー数を集計
    SELECT COUNT(*) INTO views_cnt
    FROM views_log 
    WHERE work_id = work_record.work_id;
    
    -- worksテーブルを更新
    UPDATE works 
    SET 
      likes_count = likes_cnt,
      comments_count = comments_cnt,
      views_count = views_cnt,
      stats_last_updated = NOW()
    WHERE work_id = work_record.work_id;
  END LOOP;
  
  RAISE NOTICE 'Works statistics initialized successfully';
END $$;