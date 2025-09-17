-- 作品ページパフォーマンス最適化のためのPostgreSQL関数
-- 2025-01-17

-- 1. ユーザーと作品の相互作用状態を一括取得する高速関数
CREATE OR REPLACE FUNCTION get_user_work_interactions(
    p_user_id UUID,
    p_work_id UUID
)
RETURNS TABLE (
    is_liked BOOLEAN,
    is_bookmarked BOOLEAN,
    reading_progress FLOAT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(
            SELECT 1 FROM likes 
            WHERE user_id = p_user_id AND work_id = p_work_id
        ) as is_liked,
        EXISTS(
            SELECT 1 FROM bookmarks 
            WHERE user_id = p_user_id AND work_id = p_work_id
        ) as is_bookmarked,
        COALESCE(
            (SELECT progress_percentage FROM reading_progress 
             WHERE user_id = p_user_id AND work_id = p_work_id),
            0.0
        ) as reading_progress;
END;
$$;

-- 2. 作品の詳細情報とシリーズ情報を一括取得する関数
CREATE OR REPLACE FUNCTION get_work_with_series_info(
    p_work_id UUID
)
RETURNS TABLE (
    work_id UUID,
    title TEXT,
    content TEXT,
    description TEXT,
    category TEXT,
    tags TEXT[],
    views_count INTEGER,
    likes_count INTEGER,
    comments_count INTEGER,
    is_published BOOLEAN,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    series_id UUID,
    episode_number INTEGER,
    image_url TEXT,
    use_series_image BOOLEAN,
    author_username TEXT,
    series_title TEXT,
    series_cover_url TEXT,
    series_works JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    work_record RECORD;
    series_data JSONB;
BEGIN
    -- 作品の基本情報を取得
    SELECT 
        w.work_id, w.title, w.content, w.description, w.category, w.tags,
        w.views_count, w.likes_count, w.comments_count,
        w.is_published, w.scheduled_at, w.created_at, w.updated_at,
        w.series_id, w.episode_number, w.image_url, w.use_series_image,
        u.username as author_username,
        s.title as series_title,
        s.cover_image_url as series_cover_url
    INTO work_record
    FROM works w
    LEFT JOIN users u ON u.id = w.user_id
    LEFT JOIN series s ON s.id = w.series_id
    WHERE w.work_id = p_work_id;
    
    -- シリーズ作品一覧を取得（もしシリーズの一部なら）
    IF work_record.series_id IS NOT NULL THEN
        SELECT json_agg(
            json_build_object(
                'work_id', sw.work_id,
                'title', sw.title,
                'episode_number', sw.episode_number
            ) ORDER BY sw.episode_number
        )
        INTO series_data
        FROM works sw
        WHERE sw.series_id = work_record.series_id
            AND sw.is_published = true;
    ELSE
        series_data := '[]'::jsonb;
    END IF;
    
    -- 結果を返す
    RETURN QUERY SELECT 
        work_record.work_id,
        work_record.title,
        work_record.content,
        work_record.description,
        work_record.category,
        work_record.tags,
        work_record.views_count,
        work_record.likes_count,
        work_record.comments_count,
        work_record.is_published,
        work_record.scheduled_at,
        work_record.created_at,
        work_record.updated_at,
        work_record.series_id,
        work_record.episode_number,
        work_record.image_url,
        work_record.use_series_image,
        work_record.author_username,
        work_record.series_title,
        work_record.series_cover_url,
        series_data;
END;
$$;

-- 3. 読書履歴の高速取得関数
CREATE OR REPLACE FUNCTION get_user_reading_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 6,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    work_id UUID,
    title TEXT,
    author TEXT,
    category TEXT,
    tags TEXT[],
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP,
    series_id UUID,
    episode_number INTEGER,
    use_series_image BOOLEAN,
    series_title TEXT,
    series_cover_url TEXT,
    progress FLOAT,
    last_read_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.work_id,
        w.title,
        u.username as author,
        w.category,
        w.tags,
        w.image_url,
        w.description,
        w.created_at,
        w.series_id,
        w.episode_number,
        w.use_series_image,
        s.title as series_title,
        s.cover_image_url as series_cover_url,
        rp.progress_percentage as progress,
        rp.updated_at as last_read_at
    FROM reading_progress rp
    JOIN works w ON w.work_id = rp.work_id
    JOIN users u ON u.id = w.user_id
    LEFT JOIN series s ON s.id = w.series_id
    WHERE rp.user_id = p_user_id
        AND rp.progress_percentage > 1
        AND w.is_published = true
    ORDER BY rp.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_user_work_interactions(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_work_with_series_info(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_reading_history(UUID, INTEGER, INTEGER) TO anon, authenticated;