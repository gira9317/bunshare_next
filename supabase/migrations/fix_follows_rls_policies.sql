-- ===================================================================
-- followsテーブルのRLSポリシー修正
-- ===================================================================
-- 現在の問題点：
-- 1. 全てのフォロー関係が全員に見える (USING: true)
-- 2. プライバシー上問題がある
-- 3. 非公開アカウントのフォロー関係も見える
-- ===================================================================

-- ===================================================================
-- 1. followsテーブルの既存ポリシーを削除
-- ===================================================================
DROP POLICY IF EXISTS "follows_select_all" ON public.follows;
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
DROP POLICY IF EXISTS "follows_update_related" ON public.follows;
DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;

-- ===================================================================
-- 2. followsテーブルの改善されたポリシーを作成
-- ===================================================================

-- フォロー関係の閲覧権限を制限
CREATE POLICY "follows_select_related_or_public_profiles" ON public.follows
    FOR SELECT
    USING (
        -- 自分が関わるフォロー関係は常に閲覧可能
        follower_id = auth.uid() OR followed_id = auth.uid()
        -- または、両方のユーザーが公開プロフィールの場合のみ閲覧可能
        OR (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = follows.follower_id 
                AND users.public_profile = true
            )
            AND EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = follows.followed_id 
                AND users.public_profile = true
            )
        )
    );

-- 自分がフォロワーとなる関係のみ作成可能
CREATE POLICY "follows_insert_own" ON public.follows
    FOR INSERT
    WITH CHECK (
        follower_id = auth.uid()
        AND follower_id != followed_id  -- 自分自身をフォローできない
    );

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
-- 3. パフォーマンス改善のためのインデックス確認
-- ===================================================================

-- 既存のインデックスが適切かチェック（既に存在するはず）
-- follows_follower_status_idx: (follower_id, status)
-- follows_followed_status_idx: (followed_id, status)
-- follows_status_idx: (status)

-- 公開プロフィール用の複合インデックスを追加（まだない場合）
CREATE INDEX IF NOT EXISTS idx_follows_public_profiles 
    ON public.follows(follower_id, followed_id, status) 
    WHERE status = 'approved';

-- ===================================================================
-- 4. 注意事項とテスト項目
-- ===================================================================
-- 
-- この変更により以下が実現されます：
-- 
-- ✅ 自分のフォロー/フォロワー関係は全て閲覧可能
-- ✅ 公開プロフィール同士のフォロー関係のみ他者が閲覧可能
-- ✅ 非公開プロフィールのフォロー関係は本人以外見れない
-- ✅ フォロー承認機能は継続動作
-- ✅ アンフォロー機能は継続動作
--
-- 影響を受ける可能性がある機能：
-- - おすすめユーザー機能（公開プロフィールのフォロー関係のみ利用）
-- - フォロワー/フォロー一覧表示（非公開プロフィールは制限される）
-- - ユーザー検索のフォロー状態表示
--
-- テスト項目：
-- 1. 公開プロフィール同士のフォロー関係が他者から見えることを確認
-- 2. 非公開プロフィールのフォロー関係が他者から見えないことを確認  
-- 3. 自分のフォロー/フォロワー関係が正常に表示されることを確認
-- 4. フォロー/アンフォロー機能が正常動作することを確認
-- 5. フォロー承認/拒否機能が正常動作することを確認

-- ===================================================================
-- 実行後の確認事項
-- ===================================================================
-- 1. フォロー/アンフォロー機能が正常動作することを確認
-- 2. フォロー承認/拒否機能が正常動作することを確認
-- 3. プロフィール閲覧権限が適切に制御されることを確認
-- 4. おすすめユーザー機能が公開プロフィールのみ利用することを確認
-- 5. 非公開プロフィールのプライバシーが保護されることを確認