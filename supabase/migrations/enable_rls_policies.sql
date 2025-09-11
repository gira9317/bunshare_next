-- ===================================================================
-- Bunshare RLS (Row Level Security) ポリシー設定
-- ===================================================================
-- 各テーブルに適切なアクセス制御を実装し、ユーザーのデータ保護を強化します

-- ===================================================================
-- 1. RLS有効化 (全テーブル)
-- ===================================================================

-- ユーザー関連テーブル
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 作品関連テーブル  
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works_score ENABLE ROW LEVEL SECURITY;

-- インタラクション関連テーブル
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- ログ・統計関連テーブル
ALTER TABLE public.views_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impressions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_bookmarks ENABLE ROW LEVEL SECURITY;

-- 通知・メッセージ関連テーブル
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- AI・分析関連テーブル
ALTER TABLE public.work_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_embeddings_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_content_chunks_v2 ENABLE ROW LEVEL SECURITY;

-- バッチ処理関連テーブル
ALTER TABLE public.batch_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_processing_logs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_cost_tracking ENABLE ROW LEVEL SECURITY;

-- バックグラウンド処理
ALTER TABLE public.background ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 2. usersテーブルのポリシー
-- ===================================================================

-- 全ユーザーが他のユーザーの公開プロフィールを閲覧可能
CREATE POLICY "users_select_public" ON public.users
    FOR SELECT 
    USING (public_profile = true OR id = auth.uid());

-- 自分のプロフィールのみ更新可能
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 新規ユーザー登録（サインアップ時）
CREATE POLICY "users_insert_self" ON public.users
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- ===================================================================
-- 3. worksテーブルのポリシー
-- ===================================================================

-- 公開作品は全員閲覧可能、非公開作品は作者のみ
CREATE POLICY "works_select_published_or_own" ON public.works
    FOR SELECT
    USING (
        is_published = true 
        OR user_id = auth.uid()
    );

-- 自分の作品のみ作成可能
CREATE POLICY "works_insert_own" ON public.works
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分の作品のみ更新可能
CREATE POLICY "works_update_own" ON public.works
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分の作品のみ削除可能
CREATE POLICY "works_delete_own" ON public.works
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 4. likesテーブルのポリシー
-- ===================================================================

-- 全てのいいねを閲覧可能（統計表示のため）
CREATE POLICY "likes_select_all" ON public.likes
    FOR SELECT
    USING (true);

-- 自分のいいねのみ作成可能
CREATE POLICY "likes_insert_own" ON public.likes
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分のいいねのみ削除可能
CREATE POLICY "likes_delete_own" ON public.likes
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 5. bookmarksテーブルのポリシー
-- ===================================================================

-- 公開ブックマークは全員閲覧可能、非公開は本人のみ
CREATE POLICY "bookmarks_select_public_or_own" ON public.bookmarks
    FOR SELECT
    USING (
        is_private = false 
        OR user_id = auth.uid()
    );

-- 自分のブックマークのみ作成可能
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分のブックマークのみ更新可能
CREATE POLICY "bookmarks_update_own" ON public.bookmarks
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分のブックマークのみ削除可能
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 6. followsテーブルのポリシー
-- ===================================================================

-- 全てのフォロー関係を閲覧可能（フォロワー表示のため）
CREATE POLICY "follows_select_all" ON public.follows
    FOR SELECT
    USING (true);

-- 自分がフォロワーとなる関係のみ作成可能
CREATE POLICY "follows_insert_own" ON public.follows
    FOR INSERT
    WITH CHECK (follower_id = auth.uid());

-- 自分が関わるフォロー関係のみ更新可能（承認処理など）
CREATE POLICY "follows_update_related" ON public.follows
    FOR UPDATE
    USING (
        follower_id = auth.uid() 
        OR followed_id = auth.uid()
    )
    WITH CHECK (
        follower_id = auth.uid() 
        OR followed_id = auth.uid()
    );

-- 自分がフォロワーの関係のみ削除可能（アンフォロー）
CREATE POLICY "follows_delete_own" ON public.follows
    FOR DELETE
    USING (follower_id = auth.uid());

-- ===================================================================
-- 7. reviewsテーブルのポリシー
-- ===================================================================

-- 全てのレビューを閲覧可能
CREATE POLICY "reviews_select_all" ON public.reviews
    FOR SELECT
    USING (true);

-- 自分のレビューのみ作成可能
CREATE POLICY "reviews_insert_own" ON public.reviews
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分のレビューのみ更新可能
CREATE POLICY "reviews_update_own" ON public.reviews
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分のレビューのみ削除可能
CREATE POLICY "reviews_delete_own" ON public.reviews
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 8. views_logテーブルのポリシー
-- ===================================================================

-- 自分の閲覧履歴のみ閲覧可能
CREATE POLICY "views_log_select_own" ON public.views_log
    FOR SELECT
    USING (user_id = auth.uid());

-- 自分の閲覧ログのみ作成可能
CREATE POLICY "views_log_insert_own" ON public.views_log
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ===================================================================
-- 9. notificationsテーブルのポリシー
-- ===================================================================

-- 自分の通知のみ閲覧可能
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- システムのみ通知作成可能（service_roleで実行）
-- ユーザーは直接作成不可

-- 自分の通知のみ更新可能（既読フラグなど）
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分の通知のみ削除可能
CREATE POLICY "notifications_delete_own" ON public.notifications
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 10. seriesテーブルのポリシー
-- ===================================================================

-- 全てのシリーズを閲覧可能
CREATE POLICY "series_select_all" ON public.series
    FOR SELECT
    USING (true);

-- 自分のシリーズのみ作成可能
CREATE POLICY "series_insert_own" ON public.series
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分のシリーズのみ更新可能
CREATE POLICY "series_update_own" ON public.series
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分のシリーズのみ削除可能
CREATE POLICY "series_delete_own" ON public.series
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 11. reading_progressテーブルのポリシー
-- ===================================================================

-- 自分の読書進捗のみ閲覧可能
CREATE POLICY "reading_progress_select_own" ON public.reading_progress
    FOR SELECT
    USING (user_id = auth.uid());

-- 自分の読書進捗のみ作成可能
CREATE POLICY "reading_progress_insert_own" ON public.reading_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分の読書進捗のみ更新可能
CREATE POLICY "reading_progress_update_own" ON public.reading_progress
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分の読書進捗のみ削除可能
CREATE POLICY "reading_progress_delete_own" ON public.reading_progress
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 12. sharesテーブルのポリシー
-- ===================================================================

-- 自分のシェア履歴のみ閲覧可能（プライバシー保護）
CREATE POLICY "shares_select_own" ON public.shares
    FOR SELECT
    USING (user_id = auth.uid());

-- 自分のシェアのみ作成可能
CREATE POLICY "shares_insert_own" ON public.shares
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ===================================================================
-- 13. user_preferencesテーブルのポリシー
-- ===================================================================

-- 自分の設定のみ閲覧可能
CREATE POLICY "user_preferences_select_own" ON public.user_preferences
    FOR SELECT
    USING (user_id = auth.uid());

-- 自分の設定のみ作成可能
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分の設定のみ更新可能
CREATE POLICY "user_preferences_update_own" ON public.user_preferences
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ===================================================================
-- 14. bookmark_foldersテーブルのポリシー
-- ===================================================================

-- システムフォルダは全員閲覧可能、ユーザーフォルダは本人のみ、または公開ブックマークがある場合
CREATE POLICY "bookmark_folders_select_system_or_own_or_public" ON public.bookmark_folders
    FOR SELECT
    USING (
        is_system = true  -- システムフォルダ
        OR user_id = auth.uid()  -- 自分のフォルダ
        OR (
            -- 公開ブックマークが含まれるフォルダ（他ユーザーも閲覧可能）
            is_private = false
            AND EXISTS (
                SELECT 1 FROM public.bookmarks b
                WHERE b.folder = bookmark_folders.folder_key
                AND b.user_id = bookmark_folders.user_id
                AND b.is_private = false
            )
        )
    );

-- 自分のフォルダのみ作成可能（システムフォルダはservice_roleで作成）
CREATE POLICY "bookmark_folders_insert_own" ON public.bookmark_folders
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分のフォルダのみ更新可能（システムフォルダは更新不可）
CREATE POLICY "bookmark_folders_update_own" ON public.bookmark_folders
    FOR UPDATE
    USING (user_id = auth.uid() AND is_system = false)
    WITH CHECK (user_id = auth.uid() AND is_system = false);

-- 自分のフォルダのみ削除可能（システムフォルダは削除不可）
CREATE POLICY "bookmark_folders_delete_own" ON public.bookmark_folders
    FOR DELETE
    USING (user_id = auth.uid() AND is_system = false);

-- ===================================================================
-- 15. reading_bookmarksテーブルのポリシー
-- ===================================================================

-- 自分の読書ブックマークのみ閲覧可能
CREATE POLICY "reading_bookmarks_select_own" ON public.reading_bookmarks
    FOR SELECT
    USING (user_id = auth.uid());

-- 自分の読書ブックマークのみ作成可能
CREATE POLICY "reading_bookmarks_insert_own" ON public.reading_bookmarks
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 自分の読書ブックマークのみ更新可能
CREATE POLICY "reading_bookmarks_update_own" ON public.reading_bookmarks
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 自分の読書ブックマークのみ削除可能
CREATE POLICY "reading_bookmarks_delete_own" ON public.reading_bookmarks
    FOR DELETE
    USING (user_id = auth.uid());

-- ===================================================================
-- 16. contact_messagesテーブルのポリシー
-- ===================================================================

-- 自分が送信したメッセージのみ閲覧可能
CREATE POLICY "contact_messages_select_own" ON public.contact_messages
    FOR SELECT
    USING (user_id = auth.uid());

-- 認証ユーザーのみメッセージ送信可能
CREATE POLICY "contact_messages_insert_auth" ON public.contact_messages
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ===================================================================
-- 17. work_analysisテーブルのポリシー
-- ===================================================================

-- 公開作品の分析結果は全員閲覧可能
CREATE POLICY "work_analysis_select_public" ON public.work_analysis
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.works 
            WHERE works.work_id = work_analysis.work_id 
            AND works.is_published = true
        )
    );

-- ===================================================================
-- 18. work_embeddingsテーブルのポリシー
-- ===================================================================

-- システムのみアクセス可能（service_roleで実行）
-- ユーザーは直接アクセス不可

-- ===================================================================
-- 19. work_embeddings_v2テーブルのポリシー
-- ===================================================================

-- システムのみアクセス可能（service_roleで実行）
-- ユーザーは直接アクセス不可

-- ===================================================================
-- 20. work_content_chunks_v2テーブルのポリシー
-- ===================================================================

-- システムのみアクセス可能（service_roleで実行）
-- ユーザーは直接アクセス不可

-- ===================================================================
-- 21. impressions_logテーブルのポリシー
-- ===================================================================

-- 自分のインプレッションログのみ閲覧可能
CREATE POLICY "impressions_log_select_own" ON public.impressions_log
    FOR SELECT
    USING (user_id = auth.uid());

-- 自分のインプレッションログのみ作成可能
CREATE POLICY "impressions_log_insert_own" ON public.impressions_log
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ===================================================================
-- 22. works_scoreテーブルのポリシー
-- ===================================================================

-- 公開作品のスコアは全員閲覧可能
CREATE POLICY "works_score_select_public" ON public.works_score
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.works 
            WHERE works.work_id = works_score.work_id 
            AND works.is_published = true
        )
    );

-- ===================================================================
-- 23. バッチ処理関連テーブルのポリシー
-- ===================================================================

-- batch_mappings, batch_processing_logs, embedding_processing_logs_v2, 
-- embedding_cost_tracking, backgroundテーブルは
-- システム管理用のため、service_roleのみアクセス可能
-- 一般ユーザーはアクセス不可

-- ===================================================================
-- 完了メッセージ
-- ===================================================================
-- RLSポリシーの設定が完了しました。
-- 各テーブルに適切なアクセス制御が実装されています。