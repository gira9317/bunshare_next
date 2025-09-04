-- 既存の関数があれば削除
DROP FUNCTION IF EXISTS public.auto_publish_scheduled_works();

-- 予約投稿を自動的に公開する関数
CREATE OR REPLACE FUNCTION public.auto_publish_scheduled_works()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- scheduled_atが過去で、まだ公開されていない作品を公開
  -- SupabaseのNOW()が日本時間を返す場合があるため、明示的にUTCで比較
  UPDATE public.works
  SET 
    is_published = true,
    updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
  WHERE 
    is_published = false
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
    
  -- デバッグ用：更新された行数を返す
  RAISE NOTICE 'Auto-published % works', ROW_COUNT;
END;
$$;

-- 毎分実行するcron jobを設定（Supabase Edge Functionsまたは外部cronが必要）
-- Supabaseのダッシュボードから手動で設定するか、以下のコメントを参考に
-- SELECT cron.schedule('auto-publish-works', '* * * * *', 'SELECT public.auto_publish_scheduled_works();');

-- より簡単な解決策：作品取得時に動的に判定するビューを作成
CREATE OR REPLACE VIEW public.works_published AS
SELECT 
  *,
  CASE 
    WHEN is_published = true THEN true
    WHEN scheduled_at IS NOT NULL AND scheduled_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN true
    ELSE false
  END AS is_actually_published
FROM public.works;

-- 権限設定
GRANT SELECT ON public.works_published TO authenticated;
GRANT SELECT ON public.works_published TO anon;