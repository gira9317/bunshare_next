-- Fix notification action URLs to use correct paths with /app prefix

-- 1. Fix work published notification to use correct path
CREATE OR REPLACE FUNCTION handle_work_published()
RETURNS TRIGGER AS $$
DECLARE
  follower_record RECORD;
  author_username TEXT;
  work_title TEXT;
  follower_follow_notification BOOLEAN;
BEGIN
  -- 作品タイトルと著者名を取得
  SELECT w.title, u.username 
  INTO work_title, author_username 
  FROM works w 
  JOIN users u ON u.id = w.user_id 
  WHERE w.work_id = NEW.work_id;

  -- フォロワーに通知を送信
  FOR follower_record IN
    SELECT f.follower_id, u.follow_notification
    FROM follows f
    JOIN users u ON u.id = f.follower_id
    WHERE f.followed_id = NEW.user_id
    AND f.status = 'approved'
    AND u.follow_notification = true
    AND f.post_notification = true
  LOOP
    PERFORM create_notification(
      follower_record.follower_id,
      'work_published',
      '新しい作品が公開されました',
      author_username || 'さんが新しい作品「' || work_title || '」を公開しました',
      NEW.user_id,
      NEW.work_id,
      '/app/works/' || NEW.work_id  -- Fixed: /work/ -> /app/works/
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix follow notification to use correct profile path
CREATE OR REPLACE FUNCTION handle_follow_approval()
RETURNS TRIGGER AS $$
DECLARE
  follow_record RECORD;
  follower_username TEXT;
  followed_username TEXT;
BEGIN
  -- Get the follow record details
  SELECT * INTO follow_record FROM follows WHERE id = NEW.id;
  
  SELECT u.username INTO follower_username FROM users u WHERE u.id = follow_record.follower_id;
  SELECT u.username INTO followed_username FROM users u WHERE u.id = follow_record.followed_id;
  
  -- フォローリクエストした人に承認通知を送信
  PERFORM create_notification(
    follow_record.follower_id,
    'follow_approved',
    'フォローが承認されました',
    followed_username || 'さんがあなたのフォローリクエストを承認しました',
    follow_record.followed_id,
    NULL,
    '/app/profile/' || follow_record.followed_id  -- Fixed: /profile?id= -> /app/profile/
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Add function to fix existing notification URLs in database
CREATE OR REPLACE FUNCTION fix_existing_notification_urls()
RETURNS void AS $$
BEGIN
  -- Fix work-related URLs
  UPDATE notifications 
  SET action_url = REPLACE(action_url, '/work/', '/app/works/')
  WHERE action_url LIKE '/work/%';
  
  -- Fix profile URLs 
  UPDATE notifications 
  SET action_url = REGEXP_REPLACE(action_url, '/profile\?id=([^&]+)', '/app/profile/\1')
  WHERE action_url LIKE '/profile?id=%';
  
  RAISE NOTICE 'Fixed notification URLs';
END;
$$ LANGUAGE plpgsql;

-- Execute the fix for existing data
SELECT fix_existing_notification_urls();