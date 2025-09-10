-- Add 30-day view statistics column to works table
ALTER TABLE works ADD COLUMN IF NOT EXISTS recent_views_30d bigint DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_works_recent_views_30d ON works(recent_views_30d DESC);

-- Update the existing function to include 30-day views
CREATE OR REPLACE FUNCTION update_work_view_stats()
RETURNS TRIGGER AS $$
DECLARE
  views_24h bigint;
  views_7d bigint;
  views_30d bigint;
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
  
  SELECT COUNT(*) INTO views_30d
  FROM views_log 
  WHERE work_id = NEW.work_id 
  AND viewed_at >= NOW() - INTERVAL '30 days';
  
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
    recent_views_30d = views_30d,
    trend_score = LEAST(calculated_trend_score, 100.0), -- Cap at 100
    view_stats_updated_at = NOW()
  WHERE work_id = NEW.work_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the delete function to include 30-day views
CREATE OR REPLACE FUNCTION update_work_view_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  views_24h bigint;
  views_7d bigint;
  views_30d bigint;
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
  
  SELECT COUNT(*) INTO views_30d
  FROM views_log 
  WHERE work_id = OLD.work_id 
  AND viewed_at >= NOW() - INTERVAL '30 days';
  
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
    recent_views_30d = views_30d,
    trend_score = LEAST(calculated_trend_score, 100.0),
    view_stats_updated_at = NOW()
  WHERE work_id = OLD.work_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Initialize existing data with 30-day views
DO $$
DECLARE
  work_record RECORD;
  views_24h bigint;
  views_7d bigint;
  views_30d bigint;
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
    
    -- Calculate 30d views
    SELECT COUNT(*) INTO views_30d
    FROM views_log 
    WHERE work_id = work_record.work_id 
    AND viewed_at >= NOW() - INTERVAL '30 days';
    
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
      recent_views_30d = views_30d,
      trend_score = LEAST(calculated_trend_score, 100.0),
      view_stats_updated_at = NOW()
    WHERE work_id = work_record.work_id;
  END LOOP;
END $$;