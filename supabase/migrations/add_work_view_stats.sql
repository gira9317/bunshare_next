-- Add aggregated view statistics columns to works table
ALTER TABLE works ADD COLUMN IF NOT EXISTS recent_views_24h bigint DEFAULT 0;
ALTER TABLE works ADD COLUMN IF NOT EXISTS recent_views_7d bigint DEFAULT 0;
ALTER TABLE works ADD COLUMN IF NOT EXISTS trend_score numeric(5,2) DEFAULT 0.00;
ALTER TABLE works ADD COLUMN IF NOT EXISTS view_stats_updated_at timestamp with time zone DEFAULT now();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_works_recent_views_24h ON works(recent_views_24h DESC);
CREATE INDEX IF NOT EXISTS idx_works_recent_views_7d ON works(recent_views_7d DESC);
CREATE INDEX IF NOT EXISTS idx_works_trend_score ON works(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_views_log_work_viewed ON views_log(work_id, viewed_at);

-- Function to update work view statistics
CREATE OR REPLACE FUNCTION update_work_view_stats()
RETURNS TRIGGER AS $$
DECLARE
  views_24h bigint;
  views_7d bigint;
  calculated_trend_score numeric(5,2);
  work_likes bigint;
  work_age_days integer;
BEGIN
  -- Get current view counts
  SELECT COUNT(*) INTO views_24h
  FROM views_log 
  WHERE work_id = NEW.work_id 
  AND viewed_at >= NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO views_7d
  FROM views_log 
  WHERE work_id = NEW.work_id 
  AND viewed_at >= NOW() - INTERVAL '7 days';
  
  -- Get work likes and age for trend score calculation
  SELECT 
    likes,
    EXTRACT(DAYS FROM NOW() - created_at)
  INTO work_likes, work_age_days
  FROM works 
  WHERE work_id = NEW.work_id;
  
  -- Calculate trend score (recent views + likes bonus + recency bonus)
  calculated_trend_score := 
    (views_24h * 2.0) + 
    (COALESCE(work_likes, 0) * 1.5) + 
    CASE 
      WHEN work_age_days <= 7 THEN 20.0
      WHEN work_age_days <= 30 THEN 10.0
      ELSE 0.0
    END;
  
  -- Update works table
  UPDATE works 
  SET 
    recent_views_24h = views_24h,
    recent_views_7d = views_7d,
    trend_score = LEAST(calculated_trend_score, 100.0), -- Cap at 100
    view_stats_updated_at = NOW()
  WHERE work_id = NEW.work_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update work view statistics on DELETE (for cleanup)
CREATE OR REPLACE FUNCTION update_work_view_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  views_24h bigint;
  views_7d bigint;
  calculated_trend_score numeric(5,2);
  work_likes bigint;
  work_age_days integer;
BEGIN
  -- Get current view counts after deletion
  SELECT COUNT(*) INTO views_24h
  FROM views_log 
  WHERE work_id = OLD.work_id 
  AND viewed_at >= NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO views_7d
  FROM views_log 
  WHERE work_id = OLD.work_id 
  AND viewed_at >= NOW() - INTERVAL '7 days';
  
  -- Get work likes and age for trend score calculation
  SELECT 
    likes,
    EXTRACT(DAYS FROM NOW() - created_at)
  INTO work_likes, work_age_days
  FROM works 
  WHERE work_id = OLD.work_id;
  
  -- Calculate trend score
  calculated_trend_score := 
    (views_24h * 2.0) + 
    (COALESCE(work_likes, 0) * 1.5) + 
    CASE 
      WHEN work_age_days <= 7 THEN 20.0
      WHEN work_age_days <= 30 THEN 10.0
      ELSE 0.0
    END;
  
  -- Update works table
  UPDATE works 
  SET 
    recent_views_24h = views_24h,
    recent_views_7d = views_7d,
    trend_score = LEAST(calculated_trend_score, 100.0),
    view_stats_updated_at = NOW()
  WHERE work_id = OLD.work_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate trend score when likes change
CREATE OR REPLACE FUNCTION update_work_trend_score_on_likes()
RETURNS TRIGGER AS $$
DECLARE
  views_24h bigint;
  calculated_trend_score numeric(5,2);
  work_age_days integer;
BEGIN
  -- Only recalculate if likes changed
  IF OLD.likes IS DISTINCT FROM NEW.likes THEN
    -- Get current 24h views
    SELECT COUNT(*) INTO views_24h
    FROM views_log 
    WHERE work_id = NEW.work_id 
    AND viewed_at >= NOW() - INTERVAL '24 hours';
    
    -- Get work age
    SELECT EXTRACT(DAYS FROM NOW() - created_at) INTO work_age_days
    FROM works 
    WHERE work_id = NEW.work_id;
    
    -- Calculate new trend score
    calculated_trend_score := 
      (views_24h * 2.0) + 
      (COALESCE(NEW.likes, 0) * 1.5) + 
      CASE 
        WHEN work_age_days <= 7 THEN 20.0
        WHEN work_age_days <= 30 THEN 10.0
        ELSE 0.0
      END;
    
    -- Update trend score
    NEW.trend_score := LEAST(calculated_trend_score, 100.0);
    NEW.view_stats_updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_work_views_on_insert
  AFTER INSERT ON views_log
  FOR EACH ROW
  EXECUTE FUNCTION update_work_view_stats();

CREATE TRIGGER trigger_update_work_views_on_delete
  AFTER DELETE ON views_log
  FOR EACH ROW
  EXECUTE FUNCTION update_work_view_stats_on_delete();

CREATE TRIGGER trigger_update_work_trend_score
  BEFORE UPDATE ON works
  FOR EACH ROW
  EXECUTE FUNCTION update_work_trend_score_on_likes();

-- Initialize existing data (run once)
DO $$
DECLARE
  work_record RECORD;
  views_24h bigint;
  views_7d bigint;
  calculated_trend_score numeric(5,2);
  work_age_days integer;
BEGIN
  FOR work_record IN SELECT work_id, likes, created_at FROM works WHERE is_published = true LOOP
    -- Calculate 24h views
    SELECT COUNT(*) INTO views_24h
    FROM views_log 
    WHERE work_id = work_record.work_id 
    AND viewed_at >= NOW() - INTERVAL '24 hours';
    
    -- Calculate 7d views
    SELECT COUNT(*) INTO views_7d
    FROM views_log 
    WHERE work_id = work_record.work_id 
    AND viewed_at >= NOW() - INTERVAL '7 days';
    
    -- Calculate work age
    work_age_days := EXTRACT(DAYS FROM NOW() - work_record.created_at);
    
    -- Calculate trend score
    calculated_trend_score := 
      (views_24h * 2.0) + 
      (COALESCE(work_record.likes, 0) * 1.5) + 
      CASE 
        WHEN work_age_days <= 7 THEN 20.0
        WHEN work_age_days <= 30 THEN 10.0
        ELSE 0.0
      END;
    
    -- Update the work
    UPDATE works 
    SET 
      recent_views_24h = views_24h,
      recent_views_7d = views_7d,
      trend_score = LEAST(calculated_trend_score, 100.0),
      view_stats_updated_at = NOW()
    WHERE work_id = work_record.work_id;
  END LOOP;
END $$;