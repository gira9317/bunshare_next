-- Add sort_order column to bookmarks table for managing bookmark order within folders
ALTER TABLE public.bookmarks 
ADD COLUMN sort_order integer DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder_sort_order 
ON public.bookmarks (user_id, folder, sort_order);

-- Update existing bookmarks to have sort_order based on bookmarked_at
UPDATE public.bookmarks 
SET sort_order = (
  SELECT ROW_NUMBER() OVER (
    PARTITION BY user_id, folder 
    ORDER BY bookmarked_at ASC
  )
  FROM public.bookmarks b2 
  WHERE b2.id = bookmarks.id
);

-- Add comment
COMMENT ON COLUMN public.bookmarks.sort_order IS 'Order of bookmark within folder (0-based)';