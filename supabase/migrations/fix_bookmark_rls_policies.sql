-- ===================================================================
-- Bookmarks関連テーブルのRLSポリシー修正
-- ===================================================================
-- 既存のポリシーに対する改善：
-- 1. bookmark_foldersテーブル: システムフォルダと公開フォルダの扱いを改善
-- 2. bookmarksテーブル: 現在のポリシーは適切なのでそのまま維持
-- ===================================================================

-- ===================================================================
-- 1. bookmark_foldersテーブルの既存ポリシーを削除
-- ===================================================================
DROP POLICY IF EXISTS "bookmark_folders_select_own" ON public.bookmark_folders;
DROP POLICY IF EXISTS "bookmark_folders_insert_own" ON public.bookmark_folders;
DROP POLICY IF EXISTS "bookmark_folders_update_own" ON public.bookmark_folders;
DROP POLICY IF EXISTS "bookmark_folders_delete_own" ON public.bookmark_folders;

-- ===================================================================
-- 2. bookmark_foldersテーブルの改善されたポリシーを作成
-- ===================================================================

-- システムフォルダは全員閲覧可能、ユーザーフォルダは本人のみ、または公開ブックマークがある場合
CREATE POLICY "bookmark_folders_select_system_or_own_or_public" ON public.bookmark_folders
    FOR SELECT
    USING (
        is_system = true  -- システムフォルダ（全ユーザー共通）
        OR user_id = auth.uid()  -- 自分のフォルダ
        OR (
            -- 公開ブックマークが含まれる非プライベートフォルダ（他ユーザーも閲覧可能）
            is_private = false
            AND EXISTS (
                SELECT 1 FROM public.bookmarks b
                WHERE b.folder = bookmark_folders.folder_key
                AND b.user_id = bookmark_folders.user_id
                AND b.is_private = false
                LIMIT 1
            )
        )
    );

-- 自分のフォルダのみ作成可能（システムフォルダはservice_roleで作成）
CREATE POLICY "bookmark_folders_insert_own" ON public.bookmark_folders
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND is_system = false  -- ユーザーはシステムフォルダを作成できない
    );

-- 自分の非システムフォルダのみ更新可能
CREATE POLICY "bookmark_folders_update_own" ON public.bookmark_folders
    FOR UPDATE
    USING (
        user_id = auth.uid() 
        AND is_system = false
    )
    WITH CHECK (
        user_id = auth.uid() 
        AND is_system = false
    );

-- 自分の非システムフォルダのみ削除可能
CREATE POLICY "bookmark_folders_delete_own" ON public.bookmark_folders
    FOR DELETE
    USING (
        user_id = auth.uid() 
        AND is_system = false
    );

-- ===================================================================
-- 3. bookmarksテーブルのポリシー（確認用、変更なし）
-- ===================================================================
-- 注: bookmarksテーブルの既存ポリシーは適切に設定されているため変更不要
-- 
-- 既存ポリシーの内容（参考）:
-- - SELECT: 公開ブックマークは全員閲覧可能、非公開は本人のみ
-- - INSERT: 自分のブックマークのみ作成可能
-- - UPDATE: 自分のブックマークのみ更新可能
-- - DELETE: 自分のブックマークのみ削除可能

-- ===================================================================
-- 4. インデックスの推奨（パフォーマンス改善）
-- ===================================================================
-- bookmark_foldersテーブルのis_privateカラムにインデックスを追加（まだない場合）
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_is_private 
    ON public.bookmark_folders(is_private) 
    WHERE is_private = false;

-- bookmark_foldersテーブルのis_systemカラムにインデックスを追加（まだない場合）
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_is_system 
    ON public.bookmark_folders(is_system) 
    WHERE is_system = true;

-- bookmarksとbookmark_foldersの結合用インデックス（まだない場合）
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder_user 
    ON public.bookmarks(folder, user_id, is_private) 
    WHERE is_private = false;

-- ===================================================================
-- 実行後の確認事項
-- ===================================================================
-- 1. システムフォルダ（default, favorites, toread）が全ユーザーで表示されることを確認
-- 2. プライベートフォルダが本人以外には表示されないことを確認
-- 3. 公開ブックマークを含む非プライベートフォルダが他ユーザーから閲覧可能なことを確認
-- 4. システムフォルダの更新・削除ができないことを確認