-- ブックマークの既存データにsort_orderを初期化するマイグレーション
-- bookmarked_at順でsort_orderを設定（古いものが先頭）

UPDATE bookmarks 
SET sort_order = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, folder 
      ORDER BY bookmarked_at ASC
    ) as row_num
  FROM bookmarks
  WHERE sort_order = 0 OR sort_order IS NULL
) subquery 
WHERE bookmarks.id = subquery.id;

-- 確認用クエリ（コメントアウト）
-- SELECT user_id, folder, work_id, sort_order, bookmarked_at 
-- FROM bookmarks 
-- WHERE user_id = 'YOUR_USER_ID' 
-- ORDER BY user_id, folder, sort_order;