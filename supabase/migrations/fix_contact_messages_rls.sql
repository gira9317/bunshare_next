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

-- 本人のメッセージのみ閲覧可能（管理者はDBで直接操作）
CREATE POLICY "contact_messages_select_own_only" ON public.contact_messages
    FOR SELECT
    USING (
        -- 本人のメッセージ（認証ユーザーの場合のみ）
        user_id IS NOT NULL AND user_id = auth.uid()
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

-- UPDATE/DELETEは禁止（管理者はDBで直接操作）
-- 注: 管理者がstatus/admin_notesを更新する場合はDB直接操作またはservice_roleを使用

-- ===================================================================
-- 3. パフォーマンス改善のためのインデックス追加
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
-- 4. contact_messagesテーブルの列制約を確認・追加
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
-- 5. 注意事項
-- ===================================================================
-- 管理者がお問い合わせを管理する場合は以下の方法を使用：
-- 1. DB直接操作
-- 2. service_roleを使用したバックエンド処理
-- 3. 専用の管理画面（service_role経由）

-- ===================================================================
-- 実行後の確認事項
-- ===================================================================
-- 1. 匿名ユーザーが問い合わせを送信できることを確認
-- 2. 認証ユーザーが自分の問い合わせのみ確認できることを確認
-- 3. 一般ユーザーが他のユーザーの問い合わせを見れないことを確認
-- 4. 匿名ユーザーは問い合わせ送信後に閲覧できないことを確認（仕様通り）