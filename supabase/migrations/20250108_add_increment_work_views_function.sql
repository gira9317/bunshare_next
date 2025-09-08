-- worksテーブルのviewsカウンターをインクリメントするPostgreSQL関数

CREATE OR REPLACE FUNCTION increment_work_views(work_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.works 
  SET views = COALESCE(views, 0) + 1 
  WHERE works.work_id = increment_work_views.work_id;
END;
$$;