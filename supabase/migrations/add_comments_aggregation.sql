-- reviewsテーブル変更時のworksテーブル更新トリガー関数を更新
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
  ELSIF TG_OP = 'UPDATE' THEN
    -- コメント更新時は数は変わらないが、更新時刻は変更
    UPDATE works 
    SET 
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 既存のreviewsトリガーを削除して新しいものに置き換え
DROP TRIGGER IF EXISTS trigger_reviews_insert ON reviews;
DROP TRIGGER IF EXISTS trigger_reviews_delete ON reviews;
DROP TRIGGER IF EXISTS trigger_reviews_update ON reviews;

-- 新しいトリガーを作成（works.comments_countを更新）
CREATE TRIGGER trigger_update_work_comments_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_work_comments_count();

CREATE TRIGGER trigger_update_work_comments_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_work_comments_count();

CREATE TRIGGER trigger_update_work_comments_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_work_comments_count();

-- 通知用の既存トリガーは保持
-- trigger_notify_review_added は残す

-- 既存データの初期化（reviewsテーブルからcomments_countを集計）
DO $$
DECLARE
  work_record RECORD;
  comments_cnt integer;
BEGIN
  FOR work_record IN SELECT work_id FROM works WHERE is_published = true LOOP
    -- コメント数を集計（reviewsテーブルから）
    SELECT COUNT(*) INTO comments_cnt
    FROM reviews 
    WHERE work_id = work_record.work_id;
    
    -- worksテーブルのcomments_countを更新
    UPDATE works 
    SET 
      comments_count = comments_cnt,
      stats_last_updated = NOW()
    WHERE work_id = work_record.work_id;
  END LOOP;
  
  RAISE NOTICE 'Comments count initialized from reviews table';
END $$;