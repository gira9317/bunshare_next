-- 既存のviews_logテーブルに30分スロットカラムを追加するマイグレーション

-- Step 1: 新しいカラムを追加
ALTER TABLE public.views_log 
ADD COLUMN IF NOT EXISTS viewed_30min_slot timestamp with time zone;

-- Step 2: 既存データに30分スロット値を設定
UPDATE public.views_log 
SET viewed_30min_slot = (
  date_trunc('hour', viewed_at) + 
  (floor(extract(minute from viewed_at) / 30) * interval '30 minutes')
)
WHERE viewed_30min_slot IS NULL;

-- Step 3: カラムをNOT NULLに変更し、デフォルト値を設定
ALTER TABLE public.views_log 
ALTER COLUMN viewed_30min_slot SET NOT NULL,
ALTER COLUMN viewed_30min_slot SET DEFAULT (
  date_trunc('hour', now()) + 
  (floor(extract(minute from now()) / 30) * interval '30 minutes')
);

-- Step 4: 30分単位の重複防止ユニークインデックスを作成
CREATE UNIQUE INDEX IF NOT EXISTS unique_30min_view 
ON public.views_log (user_id, work_id, viewed_30min_slot);

-- Step 5: 従来の日単位ユニークインデックスを通常のインデックスに変更
DROP INDEX IF EXISTS unique_daily_view;
CREATE INDEX IF NOT EXISTS idx_daily_view 
ON public.views_log (user_id, work_id, viewed_date);

-- Step 6: パフォーマンス向上のための追加インデックス
CREATE INDEX IF NOT EXISTS idx_viewed_30min_slot 
ON public.views_log (viewed_30min_slot);

CREATE INDEX IF NOT EXISTS idx_work_views_30min 
ON public.views_log (work_id, viewed_30min_slot);