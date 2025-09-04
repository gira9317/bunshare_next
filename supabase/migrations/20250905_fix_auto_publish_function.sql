-- 既存の関数を完全に削除
DROP FUNCTION IF EXISTS public.auto_publish_scheduled_works();

-- 関数を再作成（正しい構文で）
CREATE OR REPLACE FUNCTION public.auto_publish_scheduled_works()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- scheduled_atが過去で、まだ公開されていない作品を公開
  -- すべて日本時間（JST）で統一して比較
  UPDATE public.works
  SET 
    is_published = true,
    updated_at = NOW()
  WHERE 
    is_published = false
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
    
  -- 更新された行数を取得
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- デバッグ用：更新された行数を返す
  RAISE NOTICE 'Auto-published % works', updated_count;
END;
$$;

-- テスト実行
SELECT public.auto_publish_scheduled_works();