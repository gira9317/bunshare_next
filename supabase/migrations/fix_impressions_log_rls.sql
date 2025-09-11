-- ===================================================================
-- impressions_logテーブルのRLSポリシー修正
-- ===================================================================
-- 現在の問題点：
-- 1. 匿名ユーザー（ゲスト）のインプレッション記録ができない
-- 2. user_id = auth.uid() により、user_id = NULL のデータが弾かれる
-- 3. 分析データの欠損により、CTR計算等が不正確になる
-- ===================================================================

-- ===================================================================
-- 1. impressions_logテーブルの既存ポリシーを削除
-- ===================================================================
DROP POLICY IF EXISTS "impressions_log_select_own" ON public.impressions_log;
DROP POLICY IF EXISTS "impressions_log_insert_own" ON public.impressions_log;

-- ===================================================================
-- 2. impressions_logテーブルの改善されたポリシーを作成
-- ===================================================================

-- 自分のインプレッションログのみ閲覧可能（認証ユーザーのみ）
CREATE POLICY "impressions_log_select_own_only" ON public.impressions_log
    FOR SELECT
    USING (
        -- 認証ユーザーは自分のログのみ閲覧可能
        user_id IS NOT NULL AND user_id = auth.uid()
        -- 匿名ユーザーのログは閲覧不可（プライバシー保護）
    );

-- 認証ユーザー・匿名ユーザー両方がインプレッション記録可能
CREATE POLICY "impressions_log_insert_anyone" ON public.impressions_log
    FOR INSERT
    WITH CHECK (
        -- 認証ユーザーの場合はuser_idを設定
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        -- 匿名ユーザーの場合はuser_idをNULLに設定
        OR (auth.uid() IS NULL AND user_id IS NULL)
    );

-- UPDATE/DELETEは禁止（ログデータの完全性保護）
-- 注: impressions_logは基本的に追記のみのテーブル

-- ===================================================================
-- 3. work_ctr_statsビューへのアクセス制御
-- ===================================================================

-- CTR統計ビューは管理者のみ閲覧可能にする場合
-- （現在は特に制限なし、必要に応じて以下を有効化）
-- 
-- DROP VIEW IF EXISTS work_ctr_stats;
-- CREATE OR REPLACE VIEW work_ctr_stats_admin AS
-- SELECT * FROM work_ctr_stats_internal
-- WHERE EXISTS (
--     SELECT 1 FROM public.users 
--     WHERE users.id = auth.uid() 
--     AND users.role = 'admin'
-- );

-- ===================================================================
-- 4. パフォーマンス改善のためのインデックス確認
-- ===================================================================

-- 既存のインデックスが適切に設定されているか確認
-- idx_impressions_work_time: (work_id, impressed_at)
-- idx_impressions_user_time: (user_id, impressed_at) WHERE user_id IS NOT NULL
-- idx_impressions_type_context: (impression_type, page_context)
-- idx_impressions_session: (session_id, impressed_at)
-- idx_impressions_session_work_unique: (session_id, work_id) WHERE session_id IS NOT NULL

-- 匿名ユーザー分析用の追加インデックス（必要に応じて）
CREATE INDEX IF NOT EXISTS idx_impressions_anonymous_analysis
    ON public.impressions_log(session_id, impression_type, impressed_at)
    WHERE user_id IS NULL AND session_id IS NOT NULL;

-- ===================================================================
-- 5. データクリーンアップのための制約確認
-- ===================================================================

-- impression_typeの値を制限（必要に応じて）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.table_constraints tc 
            ON cc.constraint_name = tc.constraint_name
        WHERE cc.constraint_name = 'impressions_log_impression_type_check'
        AND tc.table_name = 'impressions_log'
        AND tc.table_schema = 'public'
    ) THEN
        ALTER TABLE public.impressions_log 
        ADD CONSTRAINT impressions_log_impression_type_check 
        CHECK (impression_type IN (
            'recommendation', 'search', 'category', 'trending', 
            'popular', 'new', 'similar', 'series', 'user_works'
        ));
        RAISE NOTICE 'Added impression_type constraint';
    END IF;
END $$;

-- page_contextの値を制限（必要に応じて）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.table_constraints tc 
            ON cc.constraint_name = tc.constraint_name
        WHERE cc.constraint_name = 'impressions_log_page_context_check'
        AND tc.table_name = 'impressions_log'
        AND tc.table_schema = 'public'
    ) THEN
        ALTER TABLE public.impressions_log 
        ADD CONSTRAINT impressions_log_page_context_check 
        CHECK (page_context IN (
            'home', 'search', 'user_profile', 'work_detail', 
            'category', 'series', 'trending', 'recommendations'
        ));
        RAISE NOTICE 'Added page_context constraint';
    END IF;
END $$;

-- ===================================================================
-- 6. 注意事項
-- ===================================================================
-- 
-- この修正により以下が実現されます：
-- 
-- ✅ 匿名ユーザー（ゲスト）のインプレッション記録が可能
-- ✅ 認証ユーザーは自分のログのみ閲覧可能
-- ✅ 匿名ユーザーのログはプライバシー保護（閲覧不可）
-- ✅ CTR計算等の分析データが正確になる
-- ✅ ログデータの完全性が保護される
-- 
-- API実装との整合性：
-- - /api/impressions/record で user?.id || null が正常動作
-- - セッション重複チェックが正常動作
-- - ボット検出・異常値検出が正常動作
--
-- 分析への影響：
-- - work_ctr_stats ビューが匿名ユーザーデータも含めて正確に計算
-- - レコメンデーション改善のためのデータがより豊富に
-- - A/Bテスト等の施策効果測定がより正確に

-- ===================================================================
-- 実行後の確認事項
-- ===================================================================
-- 1. 認証ユーザーのインプレッション記録が正常動作することを確認
-- 2. 匿名ユーザーのインプレッション記録が正常動作することを確認
-- 3. 認証ユーザーが自分のログのみ閲覧できることを確認
-- 4. 匿名ユーザーがログを閲覧できないことを確認
-- 5. CTR統計の計算が匿名ユーザーデータを含めて正確に行われることを確認