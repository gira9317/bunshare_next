-- ===================================================================
-- contact_messagesテーブルのRLSポリシー修正
-- ===================================================================
-- 現在の問題点：
-- 1. 匿名ユーザーからの問い合わせができない
-- 2. 管理者がメッセージを確認できない  
-- 3. ステータス管理ができない
-- ===================================================================

-- ===================================================================
-- 1. contact_messagesテーブルの既存ポリシーを削除
-- ===================================================================
DROP POLICY IF EXISTS "contact_messages_select_own" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_messages_insert_auth" ON public.contact_messages;

-- ===================================================================
-- 2. contact_messagesテーブルの改善されたポリシーを作成
-- ===================================================================

-- 本人または管理者のみ閲覧可能
CREATE POLICY "contact_messages_select_own_or_admin" ON public.contact_messages
    FOR SELECT
    USING (
        -- 本人のメッセージ（認証ユーザーの場合）
        (user_id IS NOT NULL AND user_id = auth.uid())
        -- 管理者はすべてのメッセージを閲覧可能
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
        -- 匿名ユーザーは自分が送信したメッセージのみ（セッション内で管理）
        -- 注: 匿名メッセージの場合、実際の制御はアプリケーション層で行う
    );

-- 認証ユーザー・匿名ユーザー両方が問い合わせ作成可能
CREATE POLICY "contact_messages_insert_anyone" ON public.contact_messages
    FOR INSERT
    WITH CHECK (
        -- 認証ユーザーの場合はuser_idを設定
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        -- 匿名ユーザーの場合はuser_idをNULLに設定
        OR (auth.uid() IS NULL AND user_id IS NULL)
    );

-- 管理者のみがステータスと管理者メモを更新可能
CREATE POLICY "contact_messages_update_admin_only" ON public.contact_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- 管理者のみが削除可能（GDPR対応）
CREATE POLICY "contact_messages_delete_admin_only" ON public.contact_messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- ===================================================================
-- 3. usersテーブルにis_adminカラムを追加（まだない場合）
-- ===================================================================
-- 注: is_adminカラムが存在しない場合は追加する
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_admin'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL;
        
        -- 管理者フラグのインデックスを追加
        CREATE INDEX idx_users_is_admin ON public.users(is_admin) WHERE is_admin = true;
    END IF;
END $$;

-- ===================================================================
-- 4. パフォーマンス改善のためのインデックス追加
-- ===================================================================

-- contact_messagesテーブルのuser_idインデックス（まだない場合）
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id 
    ON public.contact_messages(user_id) 
    WHERE user_id IS NOT NULL;

-- ステータス別の検索用インデックス
CREATE INDEX IF NOT EXISTS idx_contact_messages_status 
    ON public.contact_messages(status, created_at DESC);

-- 管理者用の全体検索インデックス
CREATE INDEX IF NOT EXISTS idx_contact_messages_admin_view 
    ON public.contact_messages(created_at DESC, status, category);

-- ===================================================================
-- 5. contact_messagesテーブルの列制約を確認・追加
-- ===================================================================

-- statusカラムの制約を確認し、必要に応じて追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'contact_messages_status_check'
    ) THEN
        ALTER TABLE public.contact_messages 
        ADD CONSTRAINT contact_messages_status_check 
        CHECK (status IN ('new', 'in_progress', 'resolved', 'closed'));
    END IF;
END $$;

-- categoryカラムの制約を確認し、必要に応じて追加  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'contact_messages_category_check'
    ) THEN
        ALTER TABLE public.contact_messages 
        ADD CONSTRAINT contact_messages_category_check 
        CHECK (category IN ('bug', 'feature', 'copyright', 'account', 'content', 'other'));
    END IF;
END $$;

-- ===================================================================
-- 6. 管理者権限の設定例（実行時に適切なユーザーIDに変更）
-- ===================================================================
-- 注: 実際の管理者ユーザーIDを設定する場合は以下のようなクエリを実行
-- UPDATE public.users SET is_admin = true WHERE email = 'admin@example.com';

-- ===================================================================
-- 実行後の確認事項
-- ===================================================================
-- 1. 匿名ユーザーが問い合わせを送信できることを確認
-- 2. 認証ユーザーが自分の問い合わせを確認できることを確認
-- 3. 管理者がすべての問い合わせを確認・更新できることを確認
-- 4. 一般ユーザーが他のユーザーの問い合わせを見れないことを確認