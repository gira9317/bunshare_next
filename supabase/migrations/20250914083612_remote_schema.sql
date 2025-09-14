

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "_internal";


ALTER SCHEMA "_internal" OWNER TO "postgres";


COMMENT ON SCHEMA "_internal" IS 'Private schema for internal recommendation data - not accessible via public API';



CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "_internal"."cron_refresh_recommendations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  error_message TEXT;
BEGIN
  start_time := NOW();
  
  -- ログ出力
  RAISE NOTICE '🔄 [CRON] 推薦キャッシュ更新開始: %', start_time;
  
  BEGIN
    -- マテリアライズドビューを並行更新
    RAISE NOTICE '📊 [CRON] ユーザー嗜好キャッシュ更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_preferences_cache;
    
    RAISE NOTICE '🔥 [CRON] 人気作品スナップショット更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_works_snapshot;
    
    RAISE NOTICE '👥 [CRON] ユーザー類似度マトリックス更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity_matrix;
    
    -- 期限切れ推薦キャッシュを削除
    RAISE NOTICE '🗑️ [CRON] 期限切れキャッシュクリーンアップ中...';
    DELETE FROM recommendation_cache WHERE expires_at <= NOW();
    
    -- 統計情報を更新
    ANALYZE user_preferences_cache;
    ANALYZE popular_works_snapshot;
    ANALYZE user_similarity_matrix;
    ANALYZE recommendation_cache;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RAISE NOTICE '✅ [CRON] 推薦キャッシュ更新完了: % (実行時間: %ms)', end_time, duration_ms;
    
    -- 成功ログをテーブルに保存
    INSERT INTO cron_execution_logs (
      job_name,
      status,
      start_time,
      end_time,
      duration_ms,
      message
    ) VALUES (
      'refresh_recommendations',
      'success',
      start_time,
      end_time,
      duration_ms,
      FORMAT('推薦キャッシュ更新成功 - 実行時間: %sms', duration_ms)
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      error_message := SQLERRM;
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      RAISE WARNING '❌ [CRON] 推薦キャッシュ更新エラー: %', error_message;
      
      -- エラーログをテーブルに保存
      INSERT INTO cron_execution_logs (
        job_name,
        status,
        start_time,
        end_time,
        duration_ms,
        message,
        error_details
      ) VALUES (
        'refresh_recommendations',
        'error',
        start_time,
        end_time,
        duration_ms,
        FORMAT('推薦キャッシュ更新失敗 - 実行時間: %sms', duration_ms),
        error_message
      );
      
      -- エラーを再発生させる
      RAISE;
  END;
END;$$;


ALTER FUNCTION "_internal"."cron_refresh_recommendations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_follow_request"("p_follow_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  follow_record RECORD;
  follower_username TEXT;
  followed_username TEXT;
BEGIN
  -- フォローレコードを取得
  SELECT f.follower_id, f.followed_id, f.status
  INTO follow_record
  FROM follows f
  WHERE f.id = p_follow_id AND f.status = 'pending';
  
  -- レコードが存在しない場合
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- ステータスを承認済みに更新
  UPDATE follows SET status = 'approved' WHERE id = p_follow_id;
  
  -- ユーザー名を取得
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
    '/profile?id=' || follow_record.followed_id
  );
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."approve_follow_request"("p_follow_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_publish_scheduled_works"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- scheduled_atが過去で、まだ公開されていない作品を公開
  -- すべて日本時間（JST）で統一して比較
  UPDATE public.works
  SET 
    is_published = true,
    updated_at = NOW()
  WHERE 
    is_published = false
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
    
  -- 更新された行数を取得
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- デバッグ用：更新された行数を返す
  RAISE NOTICE 'Auto-published % works', updated_count;
END;
$$;


ALTER FUNCTION "public"."auto_publish_scheduled_works"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_queue_embedding"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    -- 公開済み作品の場合のみ（新規公開または非公開→公開の変更）
    IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published IS DISTINCT FROM NEW.is_published) THEN
      -- embedding処理キューに追加
      INSERT INTO work_embeddings_v2 (work_id, processing_status)
      VALUES (NEW.work_id, 'pending')
      ON CONFLICT (work_id)
      DO UPDATE SET
        processing_status = 'pending',
        updated_at = now();

      RAISE NOTICE 'Added work % to embedding queue', NEW.work_id;
    END IF;

    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."auto_queue_embedding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bayesian_score"("work_rating" numeric, "work_total_ratings" integer, "global_avg_rating" numeric DEFAULT 3.5, "min_ratings_threshold" integer DEFAULT 50) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v integer := work_total_ratings;
    R numeric := work_rating;
    C numeric := global_avg_rating;
    m integer := min_ratings_threshold;
BEGIN
    -- Bayesian average formula: (v / (v + m)) * R + (m / (v + m)) * C
    IF v = 0 THEN
        RETURN C; -- Return global average if no ratings
    END IF;
    
    RETURN ROUND(
        (v::numeric / (v + m)::numeric) * R + (m::numeric / (v + m)::numeric) * C,
        2
    );
END;
$$;


ALTER FUNCTION "public"."calculate_bayesian_score"("work_rating" numeric, "work_total_ratings" integer, "global_avg_rating" numeric, "min_ratings_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_engagement_score_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Calculate engagement score based on user actions
    NEW.engagement_score := (
        CASE WHEN NEW.favorited THEN 3 ELSE 0 END +
        CASE WHEN NEW.rating >= 4 THEN 2 ELSE 0 END +
        CASE WHEN NEW.read_to_end THEN 1.5 ELSE 0 END +
        LEAST(NEW.time_spent_minutes / 10.0, 1.0) +
        CASE WHEN NEW.added_to_library THEN 0.5 ELSE 0 END +
        CASE WHEN NEW.shared THEN 0.8 ELSE 0 END +
        CASE WHEN NEW.author_followed THEN 1.2 ELSE 0 END +
        CASE WHEN NEW.continue_reading_clicked THEN 0.3 ELSE 0 END
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_engagement_score_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_user_works"("p_viewer_id" "uuid", "p_target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  target_public_profile BOOLEAN;
  target_follow_approval BOOLEAN;
  follow_status VARCHAR(20);
BEGIN
  -- 自分の場合は常に表示可能
  IF p_viewer_id = p_target_user_id THEN
    RETURN TRUE;
  END IF;

  -- 対象ユーザーの設定を取得
  SELECT public_profile, follow_approval
  INTO target_public_profile, target_follow_approval
  FROM users
  WHERE id = p_target_user_id;

  -- プロフィールが非公開の場合
  IF target_public_profile = false THEN
    RETURN FALSE;
  END IF;

  -- フォロー許可制がOFFの場合は表示可能
  IF target_follow_approval = false THEN
    RETURN TRUE;
  END IF;

  -- フォロー許可制がONの場合、承認済みフォローが必要
  SELECT status INTO follow_status
  FROM follows
  WHERE follower_id = p_viewer_id AND followed_id = p_target_user_id;

RETURN (follow_status = 'approved');
END;
$$;


ALTER FUNCTION "public"."can_view_user_works"("p_viewer_id" "uuid", "p_target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_cron_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM cron_execution_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE '🗑️ [CLEANUP] 古いCronログを削除しました';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_cron_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_test_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM notifications WHERE type IN ('like', 'follow', 'comment', 'work_published');
END;
$$;


ALTER FUNCTION "public"."clear_test_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_related_user_id" "uuid" DEFAULT NULL::"uuid", "p_related_work_id" "uuid" DEFAULT NULL::"uuid", "p_action_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- 通知を作成
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_user_id,
    related_work_id,
    action_url,
    is_read,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_related_user_id,
    p_related_work_id,
    p_action_url,
    false,
    NOW(),
    NOW()
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_related_user_id" "uuid", "p_related_work_id" "uuid", "p_action_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cron_refresh_recommendations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  error_message TEXT;
BEGIN
  start_time := NOW();
  
  -- ログ出力
  RAISE NOTICE '🔄 [CRON] 推薦キャッシュ更新開始: %', start_time;
  
  BEGIN
    -- マテリアライズドビューを並行更新
    RAISE NOTICE '📊 [CRON] ユーザー嗜好キャッシュ更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_preferences_cache;
    
    RAISE NOTICE '🔥 [CRON] 人気作品スナップショット更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_works_snapshot;
    
    RAISE NOTICE '👥 [CRON] ユーザー類似度マトリックス更新中...';
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity_matrix;
    
    -- 期限切れ推薦キャッシュを削除
    RAISE NOTICE '🗑️ [CRON] 期限切れキャッシュクリーンアップ中...';
    DELETE FROM recommendation_cache WHERE expires_at <= NOW();
    
    -- 統計情報を更新
    ANALYZE user_preferences_cache;
    ANALYZE popular_works_snapshot;
    ANALYZE user_similarity_matrix;
    ANALYZE recommendation_cache;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RAISE NOTICE '✅ [CRON] 推薦キャッシュ更新完了: % (実行時間: %ms)', end_time, duration_ms;
    
    -- 成功ログをテーブルに保存
    INSERT INTO cron_execution_logs (
      job_name,
      status,
      start_time,
      end_time,
      duration_ms,
      message
    ) VALUES (
      'refresh_recommendations',
      'success',
      start_time,
      end_time,
      duration_ms,
      FORMAT('推薦キャッシュ更新成功 - 実行時間: %sms', duration_ms)
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      error_message := SQLERRM;
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      RAISE WARNING '❌ [CRON] 推薦キャッシュ更新エラー: %', error_message;
      
      -- エラーログをテーブルに保存
      INSERT INTO cron_execution_logs (
        job_name,
        status,
        start_time,
        end_time,
        duration_ms,
        message,
        error_details
      ) VALUES (
        'refresh_recommendations',
        'error',
        start_time,
        end_time,
        duration_ms,
        FORMAT('推薦キャッシュ更新失敗 - 実行時間: %sms', duration_ms),
        error_message
      );
      
      -- エラーを再発生させる
      RAISE;
  END;
END;
$$;


ALTER FUNCTION "public"."cron_refresh_recommendations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_http_request"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    service_key text;
    auth_header text;
    request_id bigint;
  BEGIN
    -- Vaultからキーを取得
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    -- Authorizationヘッダーを構築
    auth_header := 'Bearer ' || service_key;

    -- HTTPリクエスト送信
    SELECT INTO request_id net.http_post(
      url := 'https://auemhlvikaveglwxordt.supabase.co/functions/v1/process-embeddings-v2',
      body := jsonb_build_object(
        'batch_size', 5,
        'max_cost_usd', 1.0,
        'force_reprocess', false
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', auth_header
      )
    );

    RETURN jsonb_build_object(
      'request_id', request_id,
      'auth_header_length', LENGTH(auth_header),
      'auth_header_prefix', LEFT(auth_header, 30)
    );
  END;
  $$;


ALTER FUNCTION "public"."debug_http_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_vault_key"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    service_key text;
  BEGIN
    -- Vaultからキーを取得
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    -- キーの最初の20文字だけ返す（セキュリティのため）
    RETURN jsonb_build_object(
      'key_prefix', LEFT(service_key, 20),
      'key_length', LENGTH(service_key),
      'key_exists', service_key IS NOT NULL
    );
  END;
  $$;


ALTER FUNCTION "public"."debug_vault_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_similar_users"("target_user_id" "uuid", "min_common_works" integer DEFAULT 3, "similarity_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "username" "text", "common_works_count" bigint, "avg_rating_similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH target_user_ratings AS (
        SELECT work_id, rating
        FROM work_scores
        WHERE user_id = target_user_id AND rating IS NOT NULL
    ),
    user_similarities AS (
        SELECT 
            ws.user_id,
            u.username,
            COUNT(*) as common_works_count,
            AVG(ABS(ws.rating - tur.rating)) as avg_rating_diff
        FROM work_scores ws
        JOIN target_user_ratings tur ON ws.work_id = tur.work_id
        JOIN users u ON ws.user_id = u.id
        WHERE ws.user_id != target_user_id
        AND ws.rating IS NOT NULL
        GROUP BY ws.user_id, u.username
        HAVING COUNT(*) >= min_common_works
    )
    SELECT 
        us.user_id,
        us.username,
        us.common_works_count,
        5.0 - us.avg_rating_diff as avg_rating_similarity
    FROM user_similarities us
    ORDER BY avg_rating_similarity DESC, common_works_count DESC
    LIMIT similarity_limit;
END;
$$;


ALTER FUNCTION "public"."find_similar_users"("target_user_id" "uuid", "min_common_works" integer, "similarity_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_similar_works_by_content"("target_work_id" "uuid", "similarity_threshold" double precision DEFAULT 0.8, "result_limit" integer DEFAULT 10) RETURNS TABLE("work_id" "uuid", "title" "text", "similarity_score" double precision, "category" "text", "tags" "text"[], "score_normalized" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.work_id,
        w.title,
        1 - (we1.combined_embedding <=> we2.combined_embedding) as similarity_score,
        w.category,
        w.tags,
        w.score_normalized
    FROM work_embeddings we1
    CROSS JOIN work_embeddings we2
    JOIN works w ON we2.work_id = w.work_id
    WHERE we1.work_id = target_work_id
    AND we2.work_id != target_work_id
    AND w.is_published = true
    AND 1 - (we1.combined_embedding <=> we2.combined_embedding) >= similarity_threshold
    ORDER BY we1.combined_embedding <=> we2.combined_embedding
    LIMIT result_limit;
END;
$$;


ALTER FUNCTION "public"."find_similar_works_by_content"("target_work_id" "uuid", "similarity_threshold" double precision, "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_readable_id"("length" integer DEFAULT 8) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_readable_id"("length" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_adaptive_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" bigint, "likes" bigint, "comments" bigint, "recommendation_score" numeric, "recommendation_reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH combined_recommendations AS (
    -- 個人化推薦 (60%)
    SELECT *, 'personalized' as source 
    FROM get_personalized_strategy(p_user_id, p_limit * 6 / 10, 0)
    
    UNION ALL
    
    -- 人気作品 (40%)
    SELECT *, 'popular' as source 
    FROM get_popular_strategy(p_user_id, p_limit * 4 / 10, 0)
  )
  SELECT 
    cr.work_id, cr.title, cr.description, cr.image_url, cr.category, 
    cr.tags, cr.author, cr.author_username, cr.views, cr.likes, 
    cr.comments, cr.recommendation_score, cr.recommendation_reason, cr.created_at
  FROM combined_recommendations cr
  ORDER BY cr.recommendation_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_adaptive_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cron_stats"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_executions', (
      SELECT COUNT(*) FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations'
    ),
    'success_count', (
      SELECT COUNT(*) FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations' AND status = 'success'
    ),
    'error_count', (
      SELECT COUNT(*) FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations' AND status = 'error'
    ),
    'last_execution', (
      SELECT json_build_object(
        'start_time', start_time,
        'end_time', end_time,
        'duration_ms', duration_ms,
        'status', status,
        'message', message
      )
      FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations'
      ORDER BY created_at DESC 
      LIMIT 1
    ),
    'avg_duration_ms', (
      SELECT COALESCE(ROUND(AVG(duration_ms)), 0)
      FROM cron_execution_logs 
      WHERE job_name = 'refresh_recommendations' 
        AND status = 'success'
        AND created_at > NOW() - INTERVAL '7 days'
    ),
    'recent_executions', (
      SELECT json_agg(
        json_build_object(
          'start_time', start_time,
          'status', status,
          'duration_ms', duration_ms,
          'message', message
        ) ORDER BY created_at DESC
      )
      FROM (
        SELECT start_time, status, duration_ms, message, created_at
        FROM cron_execution_logs 
        WHERE job_name = 'refresh_recommendations'
        ORDER BY created_at DESC 
        LIMIT 10
      ) recent
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_cron_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_follow_status"("p_follower_id" "uuid", "p_followed_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  follow_status VARCHAR(20);
BEGIN
  SELECT status INTO follow_status
  FROM follows
  WHERE follower_id = p_follower_id AND followed_id = p_followed_id;
  
  RETURN COALESCE(follow_status, 'none');
END;
$$;


ALTER FUNCTION "public"."get_follow_status"("p_follower_id" "uuid", "p_followed_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hybrid_recommendations"("p_user_id" "uuid", "p_current_work_id" "uuid", "p_limit" integer DEFAULT 4, "p_user_weight" double precision DEFAULT 0.7, "p_content_weight" double precision DEFAULT 0.3) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "category" "text", "is_adult_content" boolean, "image_url" "text", "series_id" "uuid", "episode_number" integer, "author_name" "text", "series_title" "text", "similarity_score" double precision)
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    -- 関数の本体（先ほど提供したコード）
  END;
  $$;


ALTER FUNCTION "public"."get_hybrid_recommendations"("p_user_id" "uuid", "p_current_work_id" "uuid", "p_limit" integer, "p_user_weight" double precision, "p_content_weight" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personalized_recommendations"("p_user_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" bigint, "likes" bigint, "comments" bigint, "recommendation_score" numeric, "recommendation_reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', '_internal'
    AS $$
DECLARE
  user_behavior_count INTEGER;
  recommendation_strategy TEXT;
BEGIN
  -- ユーザーの行動データ量を取得して戦略を決定
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM likes WHERE user_id = p_user_id) +
      (SELECT COUNT(*) FROM bookmarks WHERE user_id = p_user_id) +
      (SELECT COUNT(*) FROM views_log WHERE user_id = p_user_id) +
      (SELECT COUNT(*) FROM reviews WHERE user_id = p_user_id),
      0
    )
  INTO user_behavior_count;
  
  -- 戦略決定
  IF user_behavior_count >= 50 THEN
    recommendation_strategy := 'personalized';
  ELSIF user_behavior_count >= 10 THEN
    recommendation_strategy := 'adaptive';
  ELSE
    recommendation_strategy := 'popular';
  END IF;
  
  -- 戦略に応じて推薦を実行
  IF recommendation_strategy = 'personalized' THEN
    RETURN QUERY SELECT * FROM get_personalized_strategy(p_user_id, p_limit, p_offset);
  ELSIF recommendation_strategy = 'adaptive' THEN
    RETURN QUERY SELECT * FROM get_adaptive_strategy(p_user_id, p_limit, p_offset);
  ELSE
    RETURN QUERY SELECT * FROM get_popular_strategy(p_user_id, p_limit, p_offset);
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_personalized_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personalized_recommendations_with_embeddings"("p_user_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_embedding_weight" numeric DEFAULT 0.3) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" bigint, "likes" bigint, "comments" bigint, "recommendation_score" numeric, "recommendation_reason" "text", "created_at" timestamp with time zone, "semantic_similarity" numeric, "embedding_match_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', '_internal'
    AS $$
BEGIN
  -- エンベディングデータが不足している場合は従来の推薦にフォールバック
  IF NOT EXISTS (
    SELECT 1 FROM _internal.work_embeddings_v2 
    WHERE processing_status = 'completed' 
    LIMIT 1
  ) THEN
    -- 従来の推薦関数を呼び出し、エンベディング関連フィールドはNULLで返す
    RETURN QUERY
    SELECT 
      r.work_id,
      r.title,
      r.description,
      r.image_url,
      r.category,
      r.tags,
      r.author,
      r.author_username,
      r.views,
      r.likes,
      r.comments,
      r.recommendation_score,
      r.recommendation_reason,
      r.created_at,
      NULL::DECIMAL(5,2) as semantic_similarity,
      'no_embedding'::TEXT as embedding_match_type
    FROM get_personalized_recommendations(p_user_id, p_limit, p_offset) r;
    RETURN;
  END IF;

  -- エンベディングベース推薦の実装
  RETURN QUERY
  WITH user_preferences AS (
    -- ユーザーの嗜好作品を取得（過去30日）
    SELECT DISTINCT w.work_id
    FROM works w
    JOIN likes l ON l.work_id = w.work_id 
    WHERE l.user_id = p_user_id 
      AND l.liked_at > NOW() - INTERVAL '30 days'
    LIMIT 10  -- 計算コストを削減
  ),
  
  -- エンベディングベースの類似作品を取得
  embedding_recommendations AS (
    SELECT DISTINCT ON (w.work_id)
      w.work_id,
      w.title,
      w.description,
      w.image_url,
      w.category,
      w.tags,
      u.username as author,
      u.username as author_username,
      COALESCE(w.views_count, 0) as views,
      COALESCE(w.likes_count, 0) as likes,
      COALESCE(w.comments_count, 0) as comments,
      -- エンベディング類似度スコア
      (5.0 + (1 - MIN(we1.title_embedding <=> we2.title_embedding)) * 5.0)::DECIMAL(5,2) as recommendation_score,
      'セマンティック類似性による推薦' as recommendation_reason,
      w.created_at,
      ((1 - MIN(we1.title_embedding <=> we2.title_embedding)) * 10.0)::DECIMAL(5,2) as semantic_similarity,
      'embedding_based' as embedding_match_type
    FROM user_preferences up
    JOIN _internal.work_embeddings_v2 we1 ON we1.work_id = up.work_id
      AND we1.processing_status = 'completed'
      AND we1.title_embedding IS NOT NULL
    CROSS JOIN _internal.work_embeddings_v2 we2
    JOIN works w ON w.work_id = we2.work_id
    JOIN users u ON u.id = w.user_id
    WHERE we2.processing_status = 'completed'
      AND we2.title_embedding IS NOT NULL
      AND we2.work_id != up.work_id  -- 既に読んだ作品を除外
      AND w.is_published = true
      AND w.user_id != p_user_id  -- 自分の作品を除外
      AND NOT EXISTS (
        SELECT 1 FROM likes WHERE user_id = p_user_id AND likes.work_id = w.work_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM bookmarks WHERE user_id = p_user_id AND bookmarks.work_id = w.work_id
      )
    GROUP BY w.work_id, w.title, w.description, w.image_url, w.category, 
             w.tags, u.username, w.views_count, w.likes_count, w.comments_count, w.created_at
    ORDER BY w.work_id, recommendation_score DESC
  ),
  
  -- 従来の推薦も取得
  traditional_recommendations AS (
    SELECT 
      r.work_id,
      r.title,
      r.description,
      r.image_url,
      r.category,
      r.tags,
      r.author,
      r.author_username,
      r.views,
      r.likes,
      r.comments,
      r.recommendation_score,
      r.recommendation_reason,
      r.created_at,
      0.0::DECIMAL(5,2) as semantic_similarity,
      'traditional' as embedding_match_type
    FROM get_personalized_recommendations(p_user_id, p_limit * 2, p_offset) r
  ),
  
  -- 統合結果（エンベディング推薦を優先）
  combined_results AS (
    SELECT * FROM embedding_recommendations er
    WHERE er.semantic_similarity > 3.0  -- 類似度の閾値
    
    UNION ALL
    
    SELECT * FROM traditional_recommendations tr
    WHERE tr.work_id NOT IN (
      SELECT er2.work_id FROM embedding_recommendations er2
    )
  )
  
  SELECT * FROM combined_results cr
  ORDER BY 
    CASE cr.embedding_match_type 
      WHEN 'embedding_based' THEN 1 
      ELSE 2 
    END,
    cr.recommendation_score DESC
  LIMIT p_limit
  OFFSET p_offset;
  
END;
$$;


ALTER FUNCTION "public"."get_personalized_recommendations_with_embeddings"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_embedding_weight" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_personalized_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" bigint, "likes" bigint, "comments" bigint, "recommendation_score" numeric, "recommendation_reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- 最近読んだ作品の除外リスト（読了率10%超えで24時間以内）
  recently_read AS (
    SELECT rp.work_id
    FROM reading_progress rp
    WHERE rp.user_id = p_user_id
      AND rp.progress_percentage > 10
      AND rp.last_read_at > NOW() - INTERVAL '24 hours'
  ),
  
  -- CTRスコアの取得
  ctr_scores AS (
    SELECT 
      wcs.work_id,
      CASE 
        WHEN wcs.ctr_unique >= 0.15 THEN 2.0
        WHEN wcs.ctr_unique >= 0.05 THEN 1.5
        WHEN wcs.ctr_unique >= 0.01 THEN 1.0
        WHEN wcs.ctr_unique > 0 THEN 0.5
        ELSE 0
      END as ctr_bonus,
      CASE
        WHEN wcs.avg_display_duration >= 5000 THEN 0.5
        ELSE 0
      END as engagement_bonus
    FROM work_ctr_stats wcs
  ),
  
  -- ユーザーの嗜好分析（直近30日）
  user_preferences AS (
    SELECT 
      pref_category,
      pref_tag,
      SUM(pref_weight) as preference_weight
    FROM (
      -- いいね履歴から嗜好抽出
      SELECT 
        w1.category as pref_category,
        unnest(w1.tags) as pref_tag,
        15 as pref_weight
      FROM works w1
      JOIN likes l1 ON l1.work_id = w1.work_id 
      WHERE l1.user_id = p_user_id 
        AND l1.liked_at > NOW() - INTERVAL '30 days'
        
      UNION ALL
      
      -- ブックマーク履歴から嗜好抽出  
      SELECT 
        w2.category as pref_category,
        unnest(w2.tags) as pref_tag,
        20 as pref_weight
      FROM works w2
      JOIN bookmarks b1 ON b1.work_id = w2.work_id
      WHERE b1.user_id = p_user_id 
        AND b1.bookmarked_at > NOW() - INTERVAL '30 days'
        
      UNION ALL
      
      -- レビュー履歴から嗜好抽出
      SELECT 
        w3.category as pref_category,
        unnest(w3.tags) as pref_tag,
        10 as pref_weight
      FROM works w3
      JOIN reviews r1 ON r1.work_id = w3.work_id
      WHERE r1.user_id = p_user_id 
        AND r1.created_at > NOW() - INTERVAL '30 days'
        
      UNION ALL
      
      -- 閲覧履歴から嗜好抽出（2回以上のみ）
      SELECT 
        w4.category as pref_category,
        unnest(w4.tags) as pref_tag,
        COUNT(*) * 3 as pref_weight
      FROM works w4
      JOIN views_log v1 ON v1.work_id = w4.work_id
      WHERE v1.user_id = p_user_id 
        AND v1.viewed_at > NOW() - INTERVAL '30 days'
      GROUP BY w4.category, unnest(w4.tags)
      HAVING COUNT(*) >= 2
    ) pref_union
    GROUP BY pref_category, pref_tag
  ),
  
  -- 類似ユーザー検索（協調フィルタリング）
  similar_users AS (
    SELECT 
      su.similar_user_id,
      su.common_interactions,
      su.jaccard_similarity
    FROM (
      SELECT 
        other_user.user_id as similar_user_id,
        COUNT(*) as common_interactions,
        COUNT(*) * 1.0 / GREATEST(
          (SELECT COUNT(DISTINCT l2.work_id) FROM likes l2 WHERE l2.user_id = p_user_id) +
          (SELECT COUNT(DISTINCT l3.work_id) FROM likes l3 WHERE l3.user_id = other_user.user_id) -
          COUNT(*), 1
        ) as jaccard_similarity
      FROM (
        SELECT l4.user_id, l4.work_id FROM likes l4 WHERE l4.user_id != p_user_id
        UNION 
        SELECT b2.user_id, b2.work_id FROM bookmarks b2 WHERE b2.user_id != p_user_id
      ) other_user
      JOIN (
        SELECT l5.work_id FROM likes l5 WHERE l5.user_id = p_user_id
        UNION
        SELECT b3.work_id FROM bookmarks b3 WHERE b3.user_id = p_user_id
      ) user_interactions ON user_interactions.work_id = other_user.work_id
      GROUP BY other_user.user_id
    ) su
    WHERE su.common_interactions >= 3 AND su.jaccard_similarity > 0.1
    ORDER BY su.jaccard_similarity DESC
    LIMIT 50
  ),
  
  -- フォロー作家の作品
  followed_author_works AS (
    SELECT 
      w5.work_id,
      w5.title,
      w5.description,
      w5.image_url,
      w5.category,
      w5.tags,
      u1.username as author,
      u1.username as author_username,
      COALESCE(w5.views_count, 0)::BIGINT as views,
      COALESCE(w5.likes_count, 0)::BIGINT as likes,
      COALESCE(w5.comments_count, 0)::BIGINT as comments,
      8.0 + (COALESCE(w5.trend_score, 0) / 100.0) + COALESCE(cs1.ctr_bonus, 0) + COALESCE(cs1.engagement_bonus, 0) as recommendation_score,
      'フォロー作家の新作' as recommendation_reason,
      w5.created_at
    FROM works w5
    JOIN users u1 ON u1.id = w5.user_id
    JOIN follows f1 ON f1.followed_id = w5.user_id
    LEFT JOIN ctr_scores cs1 ON cs1.work_id = w5.work_id
    WHERE f1.follower_id = p_user_id 
      AND f1.status = 'approved'
      AND w5.is_published = true
      AND w5.work_id NOT IN (SELECT rr.work_id FROM recently_read rr)
      AND w5.work_id NOT IN (
        SELECT l6.work_id FROM likes l6 WHERE l6.user_id = p_user_id
        UNION
        SELECT b4.work_id FROM bookmarks b4 WHERE b4.user_id = p_user_id
        UNION 
        SELECT v2.work_id FROM views_log v2 WHERE v2.user_id = p_user_id
      )
    ORDER BY w5.created_at DESC
  ),
  
  -- 協調フィルタリング推薦
  collaborative_recommendations AS (
    SELECT 
      w6.work_id,
      w6.title,
      w6.description,
      w6.image_url,
      w6.category,
      w6.tags,
      u2.username as author,
      u2.username as author_username,
      COALESCE(w6.views_count, 0)::BIGINT as views,
      COALESCE(w6.likes_count, 0)::BIGINT as likes,
      COALESCE(w6.comments_count, 0)::BIGINT as comments,
      6.0 + AVG(su2.jaccard_similarity) * 4.0 + COALESCE(cs2.ctr_bonus, 0) + COALESCE(cs2.engagement_bonus, 0) as recommendation_score,
      '類似ユーザーが気に入った作品' as recommendation_reason,
      w6.created_at
    FROM similar_users su2
    JOIN (
      SELECT l7.user_id, l7.work_id FROM likes l7
      UNION
      SELECT b5.user_id, b5.work_id FROM bookmarks b5
    ) user_likes ON user_likes.user_id = su2.similar_user_id
    JOIN works w6 ON w6.work_id = user_likes.work_id
    JOIN users u2 ON u2.id = w6.user_id
    LEFT JOIN ctr_scores cs2 ON cs2.work_id = w6.work_id
    WHERE w6.is_published = true
      AND w6.work_id NOT IN (SELECT rr2.work_id FROM recently_read rr2)
      AND w6.work_id NOT IN (
        SELECT l8.work_id FROM likes l8 WHERE l8.user_id = p_user_id
        UNION
        SELECT b6.work_id FROM bookmarks b6 WHERE b6.user_id = p_user_id
        UNION
        SELECT v3.work_id FROM views_log v3 WHERE v3.user_id = p_user_id
      )
    GROUP BY w6.work_id, w6.title, w6.description, w6.image_url, w6.category, 
             w6.tags, u2.username, w6.views_count, w6.likes_count, w6.comments_count, 
             w6.created_at, cs2.ctr_bonus, cs2.engagement_bonus
  ),
  
  -- コンテンツベース推薦（嗜好マッチング）
  content_based_recommendations AS (
    SELECT 
      w7.work_id,
      w7.title,
      w7.description,
      w7.image_url,
      w7.category,
      w7.tags,
      u3.username as author,
      u3.username as author_username,
      COALESCE(w7.views_count, 0)::BIGINT as views,
      COALESCE(w7.likes_count, 0)::BIGINT as likes,
      COALESCE(w7.comments_count, 0)::BIGINT as comments,
      5.0 + 
      CASE WHEN up_cat.preference_weight > 0 THEN 2.0 ELSE 0.0 END +
      COALESCE(up_tag.total_tag_weight / 10.0, 0.0) +
      (COALESCE(w7.trend_score, 0) / 100.0) +
      COALESCE(cs3.ctr_bonus, 0) + COALESCE(cs3.engagement_bonus, 0) as recommendation_score,
      CASE 
        WHEN up_cat.preference_weight > 0 AND up_tag.total_tag_weight > 0 
        THEN 'あなたの好みに似た作品'
        WHEN up_cat.preference_weight > 0 
        THEN 'お気に入りカテゴリの作品'
        WHEN up_tag.total_tag_weight > 0 
        THEN '興味のあるタグの作品'
        ELSE '話題の作品'
      END as recommendation_reason,
      w7.created_at
    FROM works w7
    JOIN users u3 ON u3.id = w7.user_id
    LEFT JOIN user_preferences up_cat ON up_cat.pref_category = w7.category
    LEFT JOIN (
      SELECT 
        w8.work_id,
        SUM(up2.preference_weight) as total_tag_weight
      FROM works w8
      CROSS JOIN unnest(w8.tags) as work_tag
      JOIN user_preferences up2 ON up2.pref_tag = work_tag
      GROUP BY w8.work_id
    ) up_tag ON up_tag.work_id = w7.work_id
    LEFT JOIN ctr_scores cs3 ON cs3.work_id = w7.work_id
    WHERE w7.is_published = true
      AND w7.user_id != p_user_id
      AND (up_cat.preference_weight > 0 OR up_tag.total_tag_weight > 0 OR w7.trend_score > 50)
      AND w7.work_id NOT IN (SELECT rr3.work_id FROM recently_read rr3)
      AND w7.work_id NOT IN (
        SELECT l9.work_id FROM likes l9 WHERE l9.user_id = p_user_id
        UNION
        SELECT b7.work_id FROM bookmarks b7 WHERE b7.user_id = p_user_id
        UNION
        SELECT v4.work_id FROM views_log v4 WHERE v4.user_id = p_user_id
      )
  ),
  
  -- 全推薦を統合
  all_recommendations AS (
    SELECT * FROM followed_author_works
    UNION ALL
    SELECT * FROM collaborative_recommendations
    UNION ALL
    SELECT * FROM content_based_recommendations
  )
  
  SELECT DISTINCT ON (ar.work_id)
    ar.work_id,
    ar.title,
    ar.description,
    ar.image_url,
    ar.category,
    ar.tags,
    ar.author,
    ar.author_username,
    ar.views,
    ar.likes,
    ar.comments,
    ar.recommendation_score,
    ar.recommendation_reason,
    ar.created_at
  FROM all_recommendations ar
  ORDER BY ar.work_id, ar.recommendation_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_personalized_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popular_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" bigint, "likes" bigint, "comments" bigint, "recommendation_score" numeric, "recommendation_reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- 最近読んだ作品の除外リスト（ユーザーIDがある場合のみ）
  recently_read AS (
    SELECT rp.work_id
    FROM reading_progress rp
    WHERE p_user_id IS NOT NULL 
      AND rp.user_id = p_user_id
      AND rp.progress_percentage > 10
      AND rp.last_read_at > NOW() - INTERVAL '24 hours'
  ),
  
  -- CTRスコアの取得
  ctr_scores AS (
    SELECT 
      wcs.work_id,
      CASE 
        WHEN wcs.ctr_unique >= 0.15 THEN 2.0
        WHEN wcs.ctr_unique >= 0.05 THEN 1.5
        WHEN wcs.ctr_unique >= 0.01 THEN 1.0
        WHEN wcs.ctr_unique > 0 THEN 0.5
        ELSE 0
      END as ctr_bonus,
      CASE
        WHEN wcs.avg_display_duration >= 5000 THEN 0.5
        ELSE 0
      END as engagement_bonus
    FROM work_ctr_stats wcs
  ),
  
  popular_works AS (
    SELECT 
      w.work_id,
      w.title,
      w.description,
      w.image_url,
      w.category,
      w.tags,
      u.username as author,
      u.username as author_username,
      COALESCE(w.views_count, 0)::BIGINT as views,
      COALESCE(w.likes_count, 0)::BIGINT as likes,
      COALESCE(w.comments_count, 0)::BIGINT as comments,
      COALESCE(w.trend_score, 0) / 10.0 + COALESCE(cs.ctr_bonus, 0) + COALESCE(cs.engagement_bonus, 0) as recommendation_score,
      '人気作品' as recommendation_reason,
      w.created_at
    FROM works w
    JOIN users u ON u.id = w.user_id
    LEFT JOIN ctr_scores cs ON cs.work_id = w.work_id
    WHERE w.is_published = true
      AND w.work_id NOT IN (SELECT rr.work_id FROM recently_read rr)
      AND (p_user_id IS NULL OR w.work_id NOT IN (
        SELECT l.work_id FROM likes l WHERE l.user_id = p_user_id
        UNION
        SELECT b.work_id FROM bookmarks b WHERE b.user_id = p_user_id
      ))
    ORDER BY 
      recommendation_score DESC,
      COALESCE(w.likes_count, 0) DESC,
      COALESCE(w.views_count, 0) DESC
  )
  SELECT * FROM popular_works
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_popular_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popular_works_fallback"("p_limit" integer DEFAULT 20) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" integer, "likes" integer, "comments" integer, "created_at" timestamp with time zone, "trend_score" integer, "popularity_rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', '_internal'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pw.work_id,
    pw.title,
    pw.description,
    pw.image_url,
    pw.category,
    pw.tags,
    pw.author,
    pw.author_username,
    pw.views,
    pw.likes,
    pw.comments,
    pw.created_at,
    pw.trend_score,
    pw.popularity_rank
  FROM _internal.popular_works_snapshot pw
  ORDER BY pw.popularity_rank
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_popular_works_fallback"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommendation_stats"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_users_with_preferences', (SELECT COUNT(*) FROM user_preferences_cache),
    'total_popular_works', (SELECT COUNT(*) FROM popular_works_snapshot),
    'total_user_similarities', (SELECT COUNT(*) FROM user_similarity_matrix),
    'cached_recommendations', (SELECT COUNT(*) FROM recommendation_cache WHERE expires_at > NOW()),
    'last_cache_refresh', (SELECT MAX(snapshot_created_at) FROM popular_works_snapshot)
  ) INTO stats;
  
  RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_recommendation_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_similar_works_by_content"("p_current_work_id" "uuid", "p_limit" integer DEFAULT 4) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "category" "text", "is_adult_content" boolean, "image_url" "text", "series_id" "uuid", "episode_number" integer, "author_name" "text", "series_title" "text", "similarity_score" double precision)
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    -- 関数の本体（先ほど提供したコード）
  END;
  $$;


ALTER FUNCTION "public"."get_similar_works_by_content"("p_current_work_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_simple_personalized"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" integer, "likes" integer, "comments" integer, "recommendation_score" numeric, "recommendation_reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.work_id,
    w.title,
    w.description,
    w.image_url,
    w.category,
    w.tags,
    u.username::TEXT as author,
    u.username::TEXT as author_username,
    COALESCE(w.views_count, 0)::INTEGER as views,
    COALESCE(w.likes_count, 0)::INTEGER as likes,
    COALESCE(w.comments_count, 0)::INTEGER as comments,
    COALESCE(
      -- フォロー作家なら高スコア
      CASE WHEN EXISTS(
        SELECT 1 FROM follows f 
        WHERE f.follower_id = p_user_id 
        AND f.followed_id = w.user_id 
        AND f.status = 'approved'
      ) THEN 9.0 
      -- 人気度ベーススコア
      ELSE (w.trend_score / 10.0) END, 
      5.0
    )::DECIMAL(5,2) as recommendation_score,
    CASE WHEN EXISTS(
      SELECT 1 FROM follows f 
      WHERE f.follower_id = p_user_id 
      AND f.followed_id = w.user_id 
      AND f.status = 'approved'
    ) THEN 'フォロー作家の作品'
    ELSE '人気作品' END::TEXT as recommendation_reason,
    w.created_at
  FROM works w
  JOIN users u ON u.id = w.user_id
  WHERE w.is_published = true
    -- 自分の作品は除外
    AND w.user_id != p_user_id
    -- 既にいいね・ブックマーク済みは除外
    AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.user_id = p_user_id AND l.work_id = w.work_id)
    AND NOT EXISTS (SELECT 1 FROM bookmarks b WHERE b.user_id = p_user_id AND b.work_id = w.work_id)
  ORDER BY 
    -- フォロー作家作品を優先
    CASE WHEN EXISTS(
      SELECT 1 FROM follows f 
      WHERE f.follower_id = p_user_id 
      AND f.followed_id = w.user_id 
      AND f.status = 'approved'
    ) THEN 0 ELSE 1 END,
    -- 人気度順
    COALESCE(w.trend_score, 0) DESC,
    COALESCE(w.likes_count, 0) DESC,
    w.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_simple_personalized"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_simple_popular"("p_limit" integer, "p_offset" integer) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "image_url" "text", "category" "text", "tags" "text"[], "author" "text", "author_username" "text", "views" integer, "likes" integer, "comments" integer, "recommendation_score" numeric, "recommendation_reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.work_id,
    w.title,
    w.description,
    w.image_url,
    w.category,
    w.tags,
    u.username::TEXT as author,
    u.username::TEXT as author_username,
    COALESCE(w.views_count, 0)::INTEGER as views,
    COALESCE(w.likes_count, 0)::INTEGER as likes,
    COALESCE(w.comments_count, 0)::INTEGER as comments,
    COALESCE((w.trend_score / 10.0), 5.0)::DECIMAL(5,2) as recommendation_score,
    '人気作品'::TEXT as recommendation_reason,
    w.created_at
  FROM works w
  JOIN users u ON u.id = w.user_id
  WHERE w.is_published = true
  ORDER BY 
    COALESCE(w.trend_score, 0) DESC,
    COALESCE(w.likes_count, 0) DESC,
    COALESCE(w.views_count, 0) DESC,
    w.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_simple_popular"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_preferences_cache"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', '_internal'
    AS $$
DECLARE
  preferences_data JSON;
BEGIN
  SELECT json_build_object(
    'preferred_categories', COALESCE(upc.preferred_categories, ARRAY[]::TEXT[]),
    'preferred_tags', COALESCE(upc.preferred_tags, ARRAY[]::TEXT[]),
    'total_behavior_score', COALESCE(upc.total_behavior_score, 0),
    'last_updated', upc.last_updated
  )
  INTO preferences_data
  FROM _internal.user_preferences_cache upc
  WHERE upc.user_id = p_user_id;
  
  -- ユーザーが見つからない場合は空のデータを返す
  IF preferences_data IS NULL THEN
    preferences_data := json_build_object(
      'preferred_categories', ARRAY[]::TEXT[],
      'preferred_tags', ARRAY[]::TEXT[],
      'total_behavior_score', 0,
      'last_updated', NULL
    );
  END IF;
  
  RETURN preferences_data;
END;
$$;


ALTER FUNCTION "public"."get_user_preferences_cache"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_valid_recommendations"("p_user_id" "uuid", "p_limit" integer DEFAULT 20) RETURNS TABLE("work_id" "uuid", "recommendation_score" numeric, "recommendation_reason" "text", "strategy" "text")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT 
    rc.work_id,
    rc.recommendation_score,
    rc.recommendation_reason,
    rc.strategy
  FROM recommendation_cache rc
  WHERE rc.user_id = p_user_id 
    AND rc.expires_at > NOW()
  ORDER BY rc.recommendation_score DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_valid_recommendations"("p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_views_uuid"("work_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE works 
  SET views = views + 1 
  WHERE work_id = work_uuid;
END;
$$;


ALTER FUNCTION "public"."increment_views_uuid"("work_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_work_views"("work_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.works 
  SET views = COALESCE(views, 0) + 1 
  WHERE works.work_id = increment_work_views.work_id;
END;
$$;


ALTER FUNCTION "public"."increment_work_views"("work_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manual_refresh_recommendations"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSON;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
BEGIN
  start_time := NOW();
  
  -- 推薦キャッシュ更新を実行
  PERFORM cron_refresh_recommendations();
  
  end_time := NOW();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  -- 統計情報と実行結果を返す
  SELECT json_build_object(
    'success', true,
    'message', '推薦キャッシュが手動更新されました',
    'execution_time', duration_ms || 'ms',
    'start_time', start_time,
    'end_time', end_time,
    'stats', get_recommendation_stats(),
    'cron_stats', get_cron_stats()
  ) INTO result;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."manual_refresh_recommendations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_followers_of_new_work"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  follower_record RECORD;
  author_username TEXT;
  work_title TEXT;
  follower_follow_notification BOOLEAN;
BEGIN
  -- 作品が公開状態に変更された場合のみ処理
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    
    -- 作者名と作品タイトルを取得
    SELECT u.username, NEW.title
    INTO author_username, work_title
    FROM users u
    WHERE u.id = NEW.user_id;
    
    -- フォロワーの中で投稿通知設定がONの人にのみ通知を送信
    FOR follower_record IN
      SELECT f.follower_id, u.follow_notification
      FROM follows f
      JOIN users u ON f.follower_id = u.id
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
        '/work/' || NEW.work_id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_followers_of_new_work"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_recommendation_cache"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- マテリアライズドビューを並行更新（_internalスキーマ版）
  REFRESH MATERIALIZED VIEW CONCURRENTLY _internal.user_preferences_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY _internal.popular_works_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY _internal.user_similarity_matrix;
  
  -- 期限切れ推薦キャッシュを削除（もしあれば）
  DELETE FROM recommendation_cache WHERE expires_at <= NOW();
  
  RAISE NOTICE '_internal スキーマの推薦キャッシュ更新が完了しました';
END;
$$;


ALTER FUNCTION "public"."refresh_recommendation_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_follow_request"("p_follow_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- ステータスを拒否済みに更新（または削除）
  DELETE FROM follows WHERE id = p_follow_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."reject_follow_request"("p_follow_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_works_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision DEFAULT 0.7, "result_limit" integer DEFAULT 20) RETURNS TABLE("work_id" "uuid", "title" "text", "description" "text", "similarity_score" double precision, "category" "text", "tags" "text"[], "score_normalized" numeric, "author_username" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.work_id,
        w.title,
        w.description,
        1 - (we.combined_embedding <=> query_embedding) as similarity_score,
        w.category,
        w.tags,
        w.score_normalized,
        u.username as author_username
    FROM work_embeddings we
    JOIN works w ON we.work_id = w.work_id
    JOIN users u ON w.user_id = u.id
    WHERE w.is_published = true
    AND 1 - (we.combined_embedding <=> query_embedding) >= similarity_threshold
    ORDER BY we.combined_embedding <=> query_embedding
    LIMIT result_limit;
END;
$$;


ALTER FUNCTION "public"."search_works_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_embedding_processing"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    request_id bigint;
    result jsonb := jsonb_build_object('status', 'initiated');
  BEGIN
    -- pg_netを使用して非同期HTTPリクエストを送信
    SELECT INTO request_id net.http_post(
      url := 'https://auemhlvikaveglwxordt.supabase.co/functions/v1/process-embeddings-v2',
      body := jsonb_build_object(
        'batch_size', 20,
        'max_cost_usd', 10.0,
        'force_reprocess', false
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );

    -- リクエストIDを返す
    result := jsonb_build_object(
      'status', 'request_sent',
      'request_id', request_id,
      'timestamp', now()
    );

    RAISE NOTICE 'Embedding processing cron initiated with request_id: %', request_id;

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Embedding processing cron error: %', SQLERRM;
    RETURN jsonb_build_object(
      'status', 'error',
      'error', SQLERRM,
      'timestamp', now()
    );
  END;
  $$;


ALTER FUNCTION "public"."trigger_embedding_processing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_embedding_processing_secure"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
    service_key text;
    request_id bigint;
    result jsonb;
  BEGIN
    -- Vaultからservice_role_keyを取得
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    -- HTTPリクエスト送信
    SELECT INTO request_id net.http_post(
      url := 'https://auemhlvikaveglwxordt.supabase.co/functions/v1/process-embeddings-v2',
      body := jsonb_build_object(
        'batch_size', 20,
        'max_cost_usd', 10.0,
        'force_reprocess', false
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )
    );

    result := jsonb_build_object(
      'status', 'request_sent',
      'request_id', request_id,
      'timestamp', now()
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
  END;
  $$;


ALTER FUNCTION "public"."trigger_embedding_processing_secure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_likes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM update_work_stats(NEW.work_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_likes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_reviews"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM update_work_stats(NEW.work_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_reviews"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_user_preference_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- 削除時にユーザー統計を更新する処理をここに追加可能
  return coalesce(old, new);
end;
$$;


ALTER FUNCTION "public"."trigger_update_user_preference_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_work_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update statistics for the affected work
    IF TG_OP = 'DELETE' THEN
        PERFORM update_work_statistics(OLD.work_id);
        RETURN OLD;
    ELSE
        PERFORM update_work_statistics(NEW.work_id);
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."trigger_update_work_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bookmarks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_bookmarks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_embedding_cost"("p_date" "date" DEFAULT CURRENT_DATE, "p_model_name" "text" DEFAULT 'text-embedding-3-small'::"text", "p_tokens_used" integer DEFAULT 0, "p_api_calls" integer DEFAULT 1, "p_cost_usd" numeric DEFAULT 0.00) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into embedding_cost_tracking (date, model_name, total_tokens_used, total_api_calls, total_cost_usd)
  values (p_date, p_model_name, p_tokens_used, p_api_calls, p_cost_usd)
  on conflict (date, model_name) 
  do update set
    total_tokens_used = embedding_cost_tracking.total_tokens_used + p_tokens_used,
    total_api_calls = embedding_cost_tracking.total_api_calls + p_api_calls,
    total_cost_usd = embedding_cost_tracking.total_cost_usd + p_cost_usd,
    updated_at = now();
end;
$$;


ALTER FUNCTION "public"."update_daily_embedding_cost"("p_date" "date", "p_model_name" "text", "p_tokens_used" integer, "p_api_calls" integer, "p_cost_usd" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_follow_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'approved' THEN
        -- フォロワー数を増やす
        UPDATE users
        SET followers_count = followers_count + 1,
            stats_updated_at = NOW()
        WHERE id = NEW.followed_id;

        -- フォロー数を増やす
        UPDATE users
        SET following_count = following_count + 1,
            stats_updated_at = NOW()
        WHERE id = NEW.follower_id;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
        -- 承認された場合
        UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.followed_id;
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
      ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        -- 承認解除された場合
        UPDATE users SET followers_count = followers_count - 1 WHERE id = NEW.followed_id;
        UPDATE users SET following_count = following_count - 1 WHERE id = NEW.follower_id;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.status = 'approved' THEN
        UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.followed_id;
        UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_follow_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reading_progress_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reading_progress_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_user_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_stats_from_works"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.likes != NEW.likes OR OLD.views != NEW.views THEN
        UPDATE users
        SET total_likes = (
              SELECT COALESCE(SUM(likes), 0)
              FROM works
              WHERE user_id = NEW.user_id AND is_published = true
            ),
            total_views = (
              SELECT COALESCE(SUM(views), 0)
              FROM works
              WHERE user_id = NEW.user_id AND is_published = true
            ),
            stats_updated_at = NOW()
        WHERE id = NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_user_stats_from_works"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_works_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_published = true THEN
        UPDATE users
        SET works_count = works_count + 1,
            stats_updated_at = NOW()
        WHERE id = NEW.user_id;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.is_published != NEW.is_published THEN
        UPDATE users
        SET works_count = works_count + CASE
          WHEN NEW.is_published = true THEN 1
          ELSE -1
        END,
        stats_updated_at = NOW()
        WHERE id = NEW.user_id;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.is_published = true THEN
        UPDATE users
        SET works_count = works_count - 1,
            stats_updated_at = NOW()
        WHERE id = OLD.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_user_works_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- コメント追加
    UPDATE works 
    SET 
      comments_count = comments_count + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- コメント削除
    UPDATE works 
    SET 
      comments_count = GREATEST(0, comments_count - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- コメント更新時は数は変わらないが、更新時刻は変更
    UPDATE works 
    SET 
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_work_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- いいね追加
    UPDATE works 
    SET 
      likes_count = likes_count + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- いいね削除
    UPDATE works 
    SET 
      likes_count = GREATEST(0, likes_count - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_work_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_statistics"("work_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    avg_rating numeric;
    total_count integer;
    quality_score numeric;
    bayesian_score numeric;
BEGIN
    -- Calculate average rating and total count from work_scores
    SELECT 
        COALESCE(AVG(rating), 0),
        COUNT(*)
    INTO avg_rating, total_count
    FROM work_scores 
    WHERE work_id = work_uuid AND rating IS NOT NULL;
    
    -- Get AI quality score from work_analysis
    SELECT COALESCE(overall_ai_score, 0)
    INTO quality_score
    FROM work_analysis
    WHERE work_id = work_uuid;
    
    -- Calculate Bayesian average
    bayesian_score := calculate_bayesian_score(avg_rating, total_count);
    
    -- Update works table
    UPDATE works 
    SET 
        average_rating = avg_rating,
        total_ratings = total_count,
        content_quality_score = quality_score,
        score_normalized = bayesian_score,
        updated_at = now()
    WHERE work_id = work_uuid;
END;
$$;


ALTER FUNCTION "public"."update_work_statistics"("work_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_stats"("p_work_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.works
  SET
    likes = (
      SELECT COUNT(*) FROM public.likes WHERE work_id = p_work_id
    ),
    comments = (
      SELECT COUNT(*) FROM public.reviews
      WHERE work_id = p_work_id AND comment IS NOT NULL AND comment <> ''
    ),
    rating = (
      SELECT COALESCE(FLOOR(AVG(rating)), 0)::bigint
      FROM public.reviews WHERE work_id = p_work_id AND rating IS NOT NULL
    )
  WHERE work_id = p_work_id;
END;
$$;


ALTER FUNCTION "public"."update_work_stats"("p_work_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_trend_score_on_likes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  views_24h bigint;
  calculated_trend_score numeric(5,2);
  work_age_days integer;
BEGIN
  -- Only recalculate if likes changed
  IF OLD.likes IS DISTINCT FROM NEW.likes THEN
    -- Get current 24h views
    SELECT COUNT(*) INTO views_24h
    FROM views_log 
    WHERE work_id = NEW.work_id 
    AND viewed_at >= NOW() - INTERVAL '24 hours';
    
    -- Get work age
    SELECT EXTRACT(DAYS FROM NOW() - created_at) INTO work_age_days
    FROM works 
    WHERE work_id = NEW.work_id;
    
    -- Calculate new trend score
    calculated_trend_score := 
      (views_24h * 2.0) + 
      (COALESCE(NEW.likes, 0) * 1.5) + 
      CASE 
        WHEN work_age_days <= 7 THEN 20.0
        WHEN work_age_days <= 30 THEN 10.0
        ELSE 0.0
      END;
    
    -- Update trend score
    NEW.trend_score := LEAST(calculated_trend_score, 100.0);
    NEW.view_stats_updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_work_trend_score_on_likes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_view_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  views_24h bigint;
  views_7d bigint;
  views_30d bigint;
  calculated_trend_score numeric(5,2);
  work_likes bigint;
  work_age_days integer;
BEGIN
  -- Get current view counts
  SELECT COUNT(*) INTO views_24h
  FROM views_log 
  WHERE work_id = NEW.work_id 
  AND viewed_at >= NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO views_7d
  FROM views_log 
  WHERE work_id = NEW.work_id 
  AND viewed_at >= NOW() - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO views_30d
  FROM views_log 
  WHERE work_id = NEW.work_id 
  AND viewed_at >= NOW() - INTERVAL '30 days';
  
  -- Get work likes and age for trend score calculation
  SELECT 
    likes,
    EXTRACT(DAYS FROM NOW() - created_at)
  INTO work_likes, work_age_days
  FROM works 
  WHERE work_id = NEW.work_id;
  
  -- Calculate trend score (recent views + likes bonus + recency bonus)
  calculated_trend_score := 
    (views_24h * 2.0) + 
    (COALESCE(work_likes, 0) * 1.5) + 
    CASE 
      WHEN work_age_days <= 7 THEN 20.0
      WHEN work_age_days <= 30 THEN 10.0
      ELSE 0.0
    END;
  
  -- Update works table
  UPDATE works 
  SET 
    recent_views_24h = views_24h,
    recent_views_7d = views_7d,
    recent_views_30d = views_30d,
    trend_score = LEAST(calculated_trend_score, 100.0), -- Cap at 100
    view_stats_updated_at = NOW()
  WHERE work_id = NEW.work_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_work_view_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_view_stats_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  views_24h bigint;
  views_7d bigint;
  views_30d bigint;
  calculated_trend_score numeric(5,2);
  work_likes bigint;
  work_age_days integer;
BEGIN
  -- Get current view counts after deletion
  SELECT COUNT(*) INTO views_24h
  FROM views_log 
  WHERE work_id = OLD.work_id 
  AND viewed_at >= NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO views_7d
  FROM views_log 
  WHERE work_id = OLD.work_id 
  AND viewed_at >= NOW() - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO views_30d
  FROM views_log 
  WHERE work_id = OLD.work_id 
  AND viewed_at >= NOW() - INTERVAL '30 days';
  
  -- Get work likes and age for trend score calculation
  SELECT 
    likes,
    EXTRACT(DAYS FROM NOW() - created_at)
  INTO work_likes, work_age_days
  FROM works 
  WHERE work_id = OLD.work_id;
  
  -- Calculate trend score
  calculated_trend_score := 
    (views_24h * 2.0) + 
    (COALESCE(work_likes, 0) * 1.5) + 
    CASE 
      WHEN work_age_days <= 7 THEN 20.0
      WHEN work_age_days <= 30 THEN 10.0
      ELSE 0.0
    END;
  
  -- Update works table
  UPDATE works 
  SET 
    recent_views_24h = views_24h,
    recent_views_7d = views_7d,
    recent_views_30d = views_30d,
    trend_score = LEAST(calculated_trend_score, 100.0),
    view_stats_updated_at = NOW()
  WHERE work_id = OLD.work_id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_work_view_stats_on_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_views_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- ビュー追加
    UPDATE works 
    SET 
      views_count = views_count + 1,
      stats_last_updated = NOW()
    WHERE work_id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- ビュー削除（通常は発生しないが念のため）
    UPDATE works 
    SET 
      views_count = GREATEST(0, views_count - 1),
      stats_last_updated = NOW()
    WHERE work_id = OLD.work_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_work_views_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "work_id" "uuid" NOT NULL,
    "liked_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "email" "text" NOT NULL,
    "username" "text",
    "provider" "text",
    "sign_in_time" timestamp without time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "birth_date" "date",
    "gender" "text",
    "bio" "text",
    "agree_marketing" boolean DEFAULT false,
    "role" "text" DEFAULT 'user'::"text",
    "avatar_img_url" "text",
    "header_img_url" "text",
    "custom_user_id" "text",
    "website_url" "text"[],
    "public_profile" boolean DEFAULT true,
    "follow_approval" boolean DEFAULT false,
    "like_notification" boolean DEFAULT true,
    "comment_notification" boolean DEFAULT true,
    "follow_notification" boolean DEFAULT true,
    "email_notification" boolean DEFAULT false,
    "hide_bookmark_modal" boolean DEFAULT false,
    "works_count" integer DEFAULT 0,
    "followers_count" integer DEFAULT 0,
    "following_count" integer DEFAULT 0,
    "total_likes" integer DEFAULT 0,
    "total_views" bigint DEFAULT 0,
    "total_comments" integer DEFAULT 0,
    "stats_updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'ユーザログインデータ';



CREATE TABLE IF NOT EXISTS "public"."views_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "work_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    "viewed_date" "date" NOT NULL,
    "viewed_30min_slot" timestamp with time zone DEFAULT ("date_trunc"('hour'::"text", "now"()) + (("floor"((EXTRACT(minute FROM "now"()) / (30)::numeric)))::double precision * '00:30:00'::interval)) NOT NULL
);


ALTER TABLE "public"."views_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."works" (
    "work_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "category" "text",
    "views" bigint DEFAULT '0'::bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "scheduled_at" timestamp with time zone,
    "tags" "text"[],
    "is_published" boolean,
    "allow_comments" boolean,
    "likes" bigint DEFAULT '0'::bigint,
    "comments" bigint DEFAULT '0'::bigint,
    "rating" bigint DEFAULT '0'::bigint,
    "content" "text",
    "image_url" "text",
    "description" "text",
    "series_id" "uuid",
    "episode_number" integer,
    "use_series_image" boolean DEFAULT false,
    "is_adult_content" boolean DEFAULT false,
    "ai_analysis_data" "jsonb",
    "content_quality_score" numeric(3,2) DEFAULT 0.00,
    "score_normalized" numeric(3,2) DEFAULT 0.00,
    "total_ratings" integer DEFAULT 0,
    "average_rating" numeric(3,2) DEFAULT 0.00,
    "last_analyzed_at" timestamp with time zone,
    "analysis_version" integer DEFAULT 1,
    "recent_views_24h" bigint DEFAULT 0,
    "recent_views_7d" bigint DEFAULT 0,
    "trend_score" numeric(5,2) DEFAULT 0.00,
    "view_stats_updated_at" timestamp with time zone DEFAULT "now"(),
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "views_count" bigint DEFAULT 0,
    "stats_last_updated" timestamp with time zone DEFAULT "now"(),
    "recent_views_30d" bigint DEFAULT 0,
    CONSTRAINT "works_average_rating_check" CHECK ((("average_rating" >= (0)::numeric) AND ("average_rating" <= (5)::numeric))),
    CONSTRAINT "works_content_quality_score_check" CHECK ((("content_quality_score" >= (0)::numeric) AND ("content_quality_score" <= (10)::numeric))),
    CONSTRAINT "works_score_normalized_check" CHECK ((("score_normalized" >= (0)::numeric) AND ("score_normalized" <= (10)::numeric)))
);


ALTER TABLE "public"."works" OWNER TO "postgres";


COMMENT ON COLUMN "public"."works"."is_adult_content" IS '18歳以上限定コンテンツフラグ。trueの場合、18歳未満のユーザーには表示されない';



COMMENT ON COLUMN "public"."works"."ai_analysis_data" IS 'AI解析結果のJSONデータ';



COMMENT ON COLUMN "public"."works"."content_quality_score" IS 'AI判定コンテンツ品質スコア（1-10）';



COMMENT ON COLUMN "public"."works"."score_normalized" IS 'Bayesian平均による正規化スコア（1-10）';



COMMENT ON COLUMN "public"."works"."total_ratings" IS '総評価数';



COMMENT ON COLUMN "public"."works"."average_rating" IS '平均評価（1-5）';



COMMENT ON COLUMN "public"."works"."last_analyzed_at" IS '最後にAI解析された日時';



COMMENT ON COLUMN "public"."works"."analysis_version" IS '解析バージョン（将来の再解析用）';



CREATE MATERIALIZED VIEW "_internal"."popular_works_snapshot" AS
 WITH "work_stats" AS (
         SELECT "w"."work_id",
            "w"."title",
            "w"."description",
            "w"."image_url",
            "w"."category",
            "w"."tags",
            "w"."user_id",
            "w"."created_at",
            COALESCE("w"."views_count", (0)::bigint) AS "views",
            COALESCE("w"."likes_count", 0) AS "likes",
            COALESCE("w"."comments_count", 0) AS "comments",
            COALESCE("w"."trend_score", (0)::numeric) AS "trend_score",
            COALESCE(( SELECT "count"(*) AS "count"
                   FROM "public"."likes" "l"
                  WHERE (("l"."work_id" = "w"."work_id") AND ("l"."liked_at" > ("now"() - '7 days'::interval)))), (0)::bigint) AS "recent_likes",
            COALESCE(( SELECT "count"(*) AS "count"
                   FROM "public"."views_log" "v"
                  WHERE (("v"."work_id" = "w"."work_id") AND ("v"."viewed_at" > ("now"() - '7 days'::interval)))), (0)::bigint) AS "recent_views",
            ((((COALESCE("w"."trend_score", (0)::numeric) * 0.4) + ((COALESCE("w"."likes_count", 0))::numeric * 0.3)) + (((COALESCE("w"."views_count", (0)::bigint))::numeric / 10.0) * 0.2)) + ((COALESCE(( SELECT "count"(*) AS "count"
                   FROM "public"."likes" "l"
                  WHERE (("l"."work_id" = "w"."work_id") AND ("l"."liked_at" > ("now"() - '7 days'::interval)))), (0)::bigint))::numeric * 0.1)) AS "popularity_score"
           FROM "public"."works" "w"
          WHERE ("w"."is_published" = true)
        )
 SELECT "ws"."work_id",
    "ws"."title",
    "ws"."description",
    "ws"."image_url",
    "ws"."category",
    "ws"."tags",
    "ws"."user_id",
    "ws"."created_at",
    "ws"."views",
    "ws"."likes",
    "ws"."comments",
    "ws"."trend_score",
    "ws"."recent_likes",
    "ws"."recent_views",
    "ws"."popularity_score",
    "u"."username" AS "author",
    "u"."username" AS "author_username",
    "row_number"() OVER (ORDER BY "ws"."popularity_score" DESC, "ws"."created_at" DESC) AS "popularity_rank",
    "now"() AS "snapshot_created_at"
   FROM ("work_stats" "ws"
     JOIN "public"."users" "u" ON (("u"."id" = "ws"."user_id")))
  ORDER BY "ws"."popularity_score" DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "_internal"."popular_works_snapshot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "work_id" "uuid" NOT NULL,
    "bookmarked_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "folder" character varying(50) DEFAULT 'default'::character varying,
    "memo" "text",
    "is_private" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "review_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "rating" bigint DEFAULT '0'::bigint,
    "comment" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "_internal"."user_preferences_cache" AS
 SELECT "user_id",
    "array_agg"(DISTINCT "category") FILTER (WHERE ("category" IS NOT NULL)) AS "preferred_categories",
    "array_agg"(DISTINCT "tag") FILTER (WHERE ("tag" IS NOT NULL)) AS "preferred_tags",
    "sum"("interaction_weight") AS "total_behavior_score",
    "max"("last_interaction") AS "last_updated"
   FROM ( SELECT "l"."user_id",
            "w"."category",
            "unnest"("w"."tags") AS "tag",
            15 AS "interaction_weight",
            "l"."liked_at" AS "last_interaction"
           FROM ("public"."likes" "l"
             JOIN "public"."works" "w" ON (("w"."work_id" = "l"."work_id")))
          WHERE ("l"."liked_at" > ("now"() - '90 days'::interval))
        UNION ALL
         SELECT "b"."user_id",
            "w"."category",
            "unnest"("w"."tags") AS "tag",
            20 AS "interaction_weight",
            "b"."bookmarked_at" AS "last_interaction"
           FROM ("public"."bookmarks" "b"
             JOIN "public"."works" "w" ON (("w"."work_id" = "b"."work_id")))
          WHERE ("b"."bookmarked_at" > ("now"() - '90 days'::interval))
        UNION ALL
         SELECT "r"."user_id",
            "w"."category",
            "unnest"("w"."tags") AS "tag",
            12 AS "interaction_weight",
            "r"."created_at" AS "last_interaction"
           FROM ("public"."reviews" "r"
             JOIN "public"."works" "w" ON (("w"."work_id" = "r"."work_id")))
          WHERE ("r"."created_at" > ("now"() - '90 days'::interval))
        UNION ALL
         SELECT "v"."user_id",
            "w"."category",
            "unnest"("w"."tags") AS "tag",
            ("v"."view_count" * 2) AS "interaction_weight",
            "max"("v"."viewed_at") AS "last_interaction"
           FROM (( SELECT "views_log"."user_id",
                    "views_log"."work_id",
                    "count"(*) AS "view_count",
                    "max"("views_log"."viewed_at") AS "viewed_at"
                   FROM "public"."views_log"
                  WHERE ("views_log"."viewed_at" > ("now"() - '90 days'::interval))
                  GROUP BY "views_log"."user_id", "views_log"."work_id"
                 HAVING ("count"(*) >= 2)) "v"
             JOIN "public"."works" "w" ON (("w"."work_id" = "v"."work_id")))
          GROUP BY "v"."user_id", "w"."category", ("unnest"("w"."tags")), "v"."view_count") "user_interactions"
  GROUP BY "user_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "_internal"."user_preferences_cache" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "_internal"."user_similarity_matrix" AS
 WITH "user_interactions" AS (
         SELECT "likes"."user_id",
            "likes"."work_id",
            'like'::"text" AS "interaction_type",
            3 AS "weight"
           FROM "public"."likes"
        UNION ALL
         SELECT "bookmarks"."user_id",
            "bookmarks"."work_id",
            'bookmark'::"text" AS "interaction_type",
            4 AS "weight"
           FROM "public"."bookmarks"
        UNION ALL
         SELECT "reviews"."user_id",
            "reviews"."work_id",
            'review'::"text" AS "interaction_type",
            2 AS "weight"
           FROM "public"."reviews"
        ), "user_pairs" AS (
         SELECT "u1"."user_id" AS "user1_id",
            "u2"."user_id" AS "user2_id",
            "count"(DISTINCT "u1"."work_id") AS "common_works",
            "sum"(("u1"."weight" + "u2"."weight")) AS "interaction_strength",
            ((("count"(DISTINCT "u1"."work_id"))::numeric * 1.0) / (NULLIF(((( SELECT "count"(DISTINCT "user_interactions"."work_id") AS "count"
                   FROM "user_interactions"
                  WHERE ("user_interactions"."user_id" = "u1"."user_id")) + ( SELECT "count"(DISTINCT "user_interactions"."work_id") AS "count"
                   FROM "user_interactions"
                  WHERE ("user_interactions"."user_id" = "u2"."user_id"))) - "count"(DISTINCT "u1"."work_id")), 0))::numeric) AS "jaccard_similarity"
           FROM ("user_interactions" "u1"
             JOIN "user_interactions" "u2" ON ((("u1"."work_id" = "u2"."work_id") AND ("u1"."user_id" < "u2"."user_id"))))
          GROUP BY "u1"."user_id", "u2"."user_id"
         HAVING ("count"(DISTINCT "u1"."work_id") >= 3)
        )
 SELECT "user1_id",
    "user2_id",
    "common_works",
    "interaction_strength",
    "jaccard_similarity",
        CASE
            WHEN ("jaccard_similarity" >= 0.3) THEN 'high'::"text"
            WHEN ("jaccard_similarity" >= 0.1) THEN 'medium'::"text"
            ELSE 'low'::"text"
        END AS "similarity_level",
    "now"() AS "calculated_at"
   FROM "user_pairs"
  WHERE ("jaccard_similarity" > 0.05)
  WITH NO DATA;


ALTER MATERIALIZED VIEW "_internal"."user_similarity_matrix" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impressions_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "work_id" "uuid" NOT NULL,
    "impression_type" "text" NOT NULL,
    "page_context" "text",
    "position" integer,
    "session_id" "text",
    "user_agent" "text",
    "viewport_width" integer,
    "viewport_height" integer,
    "intersection_ratio" numeric(3,2),
    "display_duration" integer DEFAULT 1000,
    "impressed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "impressions_log_impression_type_check" CHECK (("impression_type" = ANY (ARRAY['recommendation'::"text", 'search'::"text", 'category'::"text", 'trending'::"text", 'popular'::"text", 'new'::"text", 'similar'::"text", 'series'::"text", 'user_works'::"text"]))),
    CONSTRAINT "impressions_log_intersection_ratio_check" CHECK ((("intersection_ratio" >= 0.00) AND ("intersection_ratio" <= 1.00))),
    CONSTRAINT "impressions_log_page_context_check" CHECK (("page_context" = ANY (ARRAY['home'::"text", 'search'::"text", 'user_profile'::"text", 'work_detail'::"text", 'category'::"text", 'series'::"text", 'trending'::"text", 'recommendations'::"text"])))
);


ALTER TABLE "public"."impressions_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "_internal"."work_ctr_stats" AS
 WITH "impression_stats" AS (
         SELECT "impressions_log"."work_id",
            "count"(*) AS "impression_count",
            "avg"("impressions_log"."intersection_ratio") AS "avg_intersection_ratio",
            "avg"("impressions_log"."display_duration") AS "avg_display_duration"
           FROM "public"."impressions_log"
          WHERE (("impressions_log"."impressed_at" >= ("now"() - '30 days'::interval)) AND ("impressions_log"."intersection_ratio" >= 0.5) AND ("impressions_log"."display_duration" >= 1000))
          GROUP BY "impressions_log"."work_id"
        ), "click_stats" AS (
         SELECT "views_log"."work_id",
            "count"(DISTINCT "views_log"."user_id") AS "unique_clicks",
            "count"(*) AS "total_clicks"
           FROM "public"."views_log"
          WHERE ("views_log"."viewed_at" >= ("now"() - '30 days'::interval))
          GROUP BY "views_log"."work_id"
        )
 SELECT "i"."work_id",
    "i"."impression_count",
    COALESCE("c"."unique_clicks", (0)::bigint) AS "unique_clicks",
    COALESCE("c"."total_clicks", (0)::bigint) AS "total_clicks",
        CASE
            WHEN ("i"."impression_count" > 0) THEN ((COALESCE("c"."unique_clicks", (0)::bigint))::double precision / ("i"."impression_count")::double precision)
            ELSE (0.0)::double precision
        END AS "ctr_unique",
        CASE
            WHEN ("i"."impression_count" > 0) THEN ((COALESCE("c"."total_clicks", (0)::bigint))::double precision / ("i"."impression_count")::double precision)
            ELSE (0.0)::double precision
        END AS "ctr_total",
    "i"."avg_intersection_ratio",
    "i"."avg_display_duration"
   FROM ("impression_stats" "i"
     LEFT JOIN "click_stats" "c" ON (("i"."work_id" = "c"."work_id")));


ALTER VIEW "_internal"."work_ctr_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "_internal"."work_embeddings_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_id" "uuid" NOT NULL,
    "title_hash" "text",
    "content_hash" "text",
    "tags_hash" "text",
    "title_embedding" "public"."vector"(1536),
    "description_embedding" "public"."vector"(1536),
    "tags_embedding" "public"."vector"(1536),
    "embedding_model" "text" DEFAULT 'text-embedding-3-small'::"text",
    "embedding_version" integer DEFAULT 1,
    "processing_status" "text" DEFAULT 'pending'::"text",
    "tokens_used" integer DEFAULT 0,
    "api_cost_usd" numeric(10,6) DEFAULT 0.00,
    "processing_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_processed_at" timestamp with time zone,
    CONSTRAINT "work_embeddings_v2_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "_internal"."work_embeddings_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backgrounds" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "detailed_bio" "text",
    "literary_genre" "text",
    "theme_genre_1" "text",
    "theme_genre_2" "text",
    "inspired_by" "text",
    "writing_style_tag_1" "text",
    "writing_style_tag_2" "text",
    "writing_style_tag_3" "text",
    "narrative_point" "text",
    "region_or_culture" "text",
    "core_trait_1" "text",
    "core_trait_2" "text",
    "core_trait_3" "text",
    "creative_style" "text",
    "social_attitude" "text",
    "frequency" "text",
    "posting_time" "text",
    "content_style" "text",
    "interaction_level" "text",
    "platform_preference" "text",
    "selected_literary_genre" "text",
    "selected_style_genre" "text",
    "generation_index" integer,
    "generation_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "backgrounds_frequency_check" CHECK (("frequency" = ANY (ARRAY['毎日'::"text", '週2-3回'::"text", '週1回'::"text", '月数回'::"text", '不定期'::"text"]))),
    CONSTRAINT "backgrounds_interaction_level_check" CHECK (("interaction_level" = ANY (ARRAY['積極的'::"text", '控えめ'::"text", '選択的'::"text", 'ほぼなし'::"text"]))),
    CONSTRAINT "backgrounds_posting_time_check" CHECK (("posting_time" = ANY (ARRAY['深夜'::"text", '早朝'::"text", '昼間'::"text", '夕方'::"text", '夜間'::"text", '不定期'::"text"])))
);


ALTER TABLE "public"."backgrounds" OWNER TO "postgres";


COMMENT ON TABLE "public"."backgrounds" IS 'AI生成作家の詳細特徴データ（usersテーブルと外部キーで関連付け）';



COMMENT ON COLUMN "public"."backgrounds"."id" IS 'usersテーブルのid（外部キー）';



COMMENT ON COLUMN "public"."backgrounds"."username" IS '作家のペンネーム';



COMMENT ON COLUMN "public"."backgrounds"."detailed_bio" IS 'SNS風の短い自己紹介文（usersテーブルのbioとは別）';



COMMENT ON COLUMN "public"."backgrounds"."literary_genre" IS '文学ジャンル';



COMMENT ON COLUMN "public"."backgrounds"."theme_genre_1" IS 'テーマジャンル1';



COMMENT ON COLUMN "public"."backgrounds"."theme_genre_2" IS 'テーマジャンル2';



COMMENT ON COLUMN "public"."backgrounds"."inspired_by" IS '影響を受けた実在作家名';



COMMENT ON COLUMN "public"."backgrounds"."writing_style_tag_1" IS '文体特徴1';



COMMENT ON COLUMN "public"."backgrounds"."writing_style_tag_2" IS '文体特徴2';



COMMENT ON COLUMN "public"."backgrounds"."writing_style_tag_3" IS '文体特徴3';



COMMENT ON COLUMN "public"."backgrounds"."narrative_point" IS '視点（一人称/三人称/その他）';



COMMENT ON COLUMN "public"."backgrounds"."region_or_culture" IS '出身地域・文化的背景';



COMMENT ON COLUMN "public"."backgrounds"."core_trait_1" IS '性格特徴1';



COMMENT ON COLUMN "public"."backgrounds"."core_trait_2" IS '性格特徴2';



COMMENT ON COLUMN "public"."backgrounds"."core_trait_3" IS '性格特徴3';



COMMENT ON COLUMN "public"."backgrounds"."creative_style" IS '創作スタイルや創作への取り組み方';



COMMENT ON COLUMN "public"."backgrounds"."social_attitude" IS '人との関わり方や社交性';



COMMENT ON COLUMN "public"."backgrounds"."frequency" IS '投稿頻度（制約付き）';



COMMENT ON COLUMN "public"."backgrounds"."posting_time" IS '投稿時間帯（制約付き）';



COMMENT ON COLUMN "public"."backgrounds"."content_style" IS '投稿内容の傾向';



COMMENT ON COLUMN "public"."backgrounds"."interaction_level" IS '読者との交流度（制約付き）';



COMMENT ON COLUMN "public"."backgrounds"."platform_preference" IS '好む投稿媒体';



COMMENT ON COLUMN "public"."backgrounds"."selected_literary_genre" IS '生成時に選択された文学ジャンル';



COMMENT ON COLUMN "public"."backgrounds"."selected_style_genre" IS '生成時に選択された作風ジャンル';



COMMENT ON COLUMN "public"."backgrounds"."generation_index" IS '生成時の順番';



CREATE TABLE IF NOT EXISTS "public"."batch_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "text" NOT NULL,
    "custom_id" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_processing_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "total_requests" integer,
    "succeeded_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "images_generated" integer DEFAULT 0,
    "error_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch_processing_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookmark_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "folder_name" character varying(50) NOT NULL,
    "folder_key" character varying(50) NOT NULL,
    "color" character varying(7) DEFAULT '#8b5cf6'::character varying,
    "icon" character varying(50) DEFAULT 'folder'::character varying,
    "sort_order" integer DEFAULT 0,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_private" boolean DEFAULT false
);


ALTER TABLE "public"."bookmark_folders" OWNER TO "postgres";


COMMENT ON TABLE "public"."bookmark_folders" IS 'ユーザーのブックマークフォルダを管理するテーブル';



COMMENT ON COLUMN "public"."bookmark_folders"."folder_key" IS 'システム内部で使用するフォルダ識別子';



COMMENT ON COLUMN "public"."bookmark_folders"."color" IS 'フォルダの表示色（HEXカラーコード）';



COMMENT ON COLUMN "public"."bookmark_folders"."sort_order" IS 'フォルダの表示順序';



CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "name" character varying(100) NOT NULL,
    "email" character varying(255),
    "device" character varying(100),
    "category" character varying(50),
    "message" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'new'::character varying NOT NULL,
    "admin_notes" "text",
    "user_agent" "text",
    "browser_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contact_messages_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['bug'::character varying, 'feature'::character varying, 'copyright'::character varying, 'account'::character varying, 'content'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "contact_messages_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::"text"[])))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_execution_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration_ms" integer,
    "message" "text",
    "error_details" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cron_execution_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text", 'running'::"text"])))
);


ALTER TABLE "public"."cron_execution_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embedding_cost_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "total_tokens_used" integer DEFAULT 0 NOT NULL,
    "total_api_calls" integer DEFAULT 0 NOT NULL,
    "total_cost_usd" numeric(10,6) DEFAULT 0.00 NOT NULL,
    "model_name" "text" DEFAULT 'text-embedding-3-small'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "embedding_cost_tracking_calls_check" CHECK (("total_api_calls" >= 0)),
    CONSTRAINT "embedding_cost_tracking_cost_check" CHECK (("total_cost_usd" >= 0.00)),
    CONSTRAINT "embedding_cost_tracking_tokens_check" CHECK (("total_tokens_used" >= 0))
);


ALTER TABLE "public"."embedding_cost_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embedding_processing_logs_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "processing_type" "text" NOT NULL,
    "chunk_index" integer,
    "status" "text" NOT NULL,
    "error_message" "text",
    "error_code" "text",
    "processing_time_ms" integer,
    "tokens_used" integer,
    "api_cost_usd" numeric(10,6),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "embedding_processing_logs_v2_chunk_consistency" CHECK (((("processing_type" = 'content_chunk'::"text") AND ("chunk_index" IS NOT NULL)) OR (("processing_type" <> 'content_chunk'::"text") AND ("chunk_index" IS NULL)))),
    CONSTRAINT "embedding_processing_logs_v2_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'failed'::"text", 'skipped'::"text"]))),
    CONSTRAINT "embedding_processing_logs_v2_type_check" CHECK (("processing_type" = ANY (ARRAY['title'::"text", 'description'::"text", 'tags'::"text", 'content_chunk'::"text"])))
);


ALTER TABLE "public"."embedding_processing_logs_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid",
    "followed_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" character varying(20) DEFAULT 'approved'::character varying,
    "post_notification" boolean DEFAULT true
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


ALTER TABLE "public"."contact_messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inquiries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "related_user_id" "uuid",
    "related_work_id" "uuid",
    "action_url" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reading_bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "work_id" "uuid" NOT NULL,
    "scroll_position" integer DEFAULT 0 NOT NULL,
    "reading_progress" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "bookmark_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reading_bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reading_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "work_id" "uuid" NOT NULL,
    "progress_percentage" numeric(5,2) DEFAULT 0.00,
    "last_read_position" integer DEFAULT 0,
    "total_content_length" integer DEFAULT 0,
    "reading_time_seconds" integer DEFAULT 0,
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "first_read_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reading_progress_progress_percentage_check" CHECK ((("progress_percentage" >= (0)::numeric) AND ("progress_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."reading_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."series" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "cover_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."series" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "work_id" "uuid" NOT NULL,
    "share_type" "text" NOT NULL,
    "shared_at" timestamp with time zone DEFAULT "now"(),
    "shared_url" "text",
    "share_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shares_share_type_check" CHECK (("share_type" = ANY (ARRAY['twitter'::"text", 'facebook'::"text", 'line'::"text", 'copy_link'::"text", 'native'::"text"])))
);


ALTER TABLE "public"."shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preference_vector" "public"."vector"(1536),
    "total_works" integer DEFAULT 0 NOT NULL,
    "total_weight" numeric(8,2) DEFAULT 0.00 NOT NULL,
    "average_weight" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "liked_works_count" integer DEFAULT 0 NOT NULL,
    "rated_works_count" integer DEFAULT 0 NOT NULL,
    "progress_works_count" integer DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_preferences_average_weight_check" CHECK (("average_weight" >= (0)::numeric)),
    CONSTRAINT "user_preferences_total_weight_check" CHECK (("total_weight" >= (0)::numeric)),
    CONSTRAINT "user_preferences_total_works_check" CHECK (("total_works" >= 0))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_preferences" IS 'ユーザーの好みベクトルと関連統計を保存するテーブル';



COMMENT ON COLUMN "public"."user_preferences"."preference_vector" IS 'ユーザーの好み傾向を表すベクトル（1536次元）';



COMMENT ON COLUMN "public"."user_preferences"."total_works" IS '好みベクトル計算に使用された作品数';



COMMENT ON COLUMN "public"."user_preferences"."total_weight" IS '重み付けの合計値';



COMMENT ON COLUMN "public"."user_preferences"."average_weight" IS '1作品あたりの平均重み';



COMMENT ON COLUMN "public"."user_preferences"."liked_works_count" IS 'いいねした作品数';



COMMENT ON COLUMN "public"."user_preferences"."rated_works_count" IS '高評価（4以上）した作品数';



COMMENT ON COLUMN "public"."user_preferences"."progress_works_count" IS '読書進捗がある作品数';



CREATE OR REPLACE VIEW "public"."whoami" WITH ("security_invoker"='on') AS
 SELECT "auth"."uid"() AS "uid",
    "auth"."jwt"() AS "jwt";


ALTER VIEW "public"."whoami" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_content_chunks_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "chunk_text" "text" NOT NULL,
    "chunk_embedding" "public"."vector"(1536),
    "token_count" integer NOT NULL,
    "chunk_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "work_content_chunks_v2_chunk_index_check" CHECK (("chunk_index" >= 0)),
    CONSTRAINT "work_content_chunks_v2_token_count_check" CHECK ((("token_count" > 0) AND ("token_count" <= 8191)))
);


ALTER TABLE "public"."work_content_chunks_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_embeddings_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_id" "uuid" NOT NULL,
    "title_hash" "text",
    "content_hash" "text",
    "tags_hash" "text",
    "title_embedding" "public"."vector"(1536),
    "description_embedding" "public"."vector"(1536),
    "tags_embedding" "public"."vector"(1536),
    "embedding_model" "text" DEFAULT 'text-embedding-3-small'::"text",
    "embedding_version" integer DEFAULT 1,
    "processing_status" "text" DEFAULT 'pending'::"text",
    "tokens_used" integer DEFAULT 0,
    "api_cost_usd" numeric(10,6) DEFAULT 0.00,
    "processing_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_processed_at" timestamp with time zone,
    CONSTRAINT "work_embeddings_v2_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."work_embeddings_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."works_published" WITH ("security_invoker"='on') AS
 SELECT "work_id",
    "user_id",
    "title",
    "category",
    "views",
    "created_at",
    "updated_at",
    "scheduled_at",
    "tags",
    "is_published",
    "allow_comments",
    "likes",
    "comments",
    "rating",
    "content",
    "image_url",
    "description",
    "series_id",
    "episode_number",
    "use_series_image",
    "is_adult_content",
    "ai_analysis_data",
    "content_quality_score",
    "score_normalized",
    "total_ratings",
    "average_rating",
    "last_analyzed_at",
    "analysis_version",
        CASE
            WHEN ("is_published" = true) THEN true
            WHEN (("scheduled_at" IS NOT NULL) AND ("scheduled_at" <= "now"())) THEN true
            ELSE false
        END AS "is_actually_published"
   FROM "public"."works";


ALTER VIEW "public"."works_published" OWNER TO "postgres";


ALTER TABLE ONLY "_internal"."work_embeddings_v2"
    ADD CONSTRAINT "work_embeddings_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "_internal"."work_embeddings_v2"
    ADD CONSTRAINT "work_embeddings_v2_work_id_key" UNIQUE ("work_id");



ALTER TABLE ONLY "public"."backgrounds"
    ADD CONSTRAINT "backgrounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_mappings"
    ADD CONSTRAINT "batch_mappings_batch_id_custom_id_key" UNIQUE ("batch_id", "custom_id");



ALTER TABLE ONLY "public"."batch_mappings"
    ADD CONSTRAINT "batch_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_processing_logs"
    ADD CONSTRAINT "batch_processing_logs_batch_id_key" UNIQUE ("batch_id");



ALTER TABLE ONLY "public"."batch_processing_logs"
    ADD CONSTRAINT "batch_processing_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmark_folders"
    ADD CONSTRAINT "bookmark_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmark_folders"
    ADD CONSTRAINT "bookmark_folders_user_key_unique" UNIQUE ("user_id", "folder_key");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_work_folder_unique" UNIQUE ("user_id", "work_id", "folder");



ALTER TABLE ONLY "public"."cron_execution_logs"
    ADD CONSTRAINT "cron_execution_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embedding_cost_tracking"
    ADD CONSTRAINT "embedding_cost_tracking_date_model_key" UNIQUE ("date", "model_name");



ALTER TABLE ONLY "public"."embedding_cost_tracking"
    ADD CONSTRAINT "embedding_cost_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embedding_processing_logs_v2"
    ADD CONSTRAINT "embedding_processing_logs_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_followed_id_key" UNIQUE ("follower_id", "followed_id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impressions_log"
    ADD CONSTRAINT "impressions_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_work_id_key" UNIQUE ("user_id", "work_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reading_bookmarks"
    ADD CONSTRAINT "reading_bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reading_bookmarks"
    ADD CONSTRAINT "reading_bookmarks_user_work_unique" UNIQUE ("user_id", "work_id");



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_user_id_work_id_key" UNIQUE ("user_id", "work_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("review_id");



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shares"
    ADD CONSTRAINT "shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backgrounds"
    ADD CONSTRAINT "unique_user_background" UNIQUE ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "user_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_custom_user_id_key" UNIQUE ("custom_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."views_log"
    ADD CONSTRAINT "views_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_content_chunks_v2"
    ADD CONSTRAINT "work_content_chunks_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_content_chunks_v2"
    ADD CONSTRAINT "work_content_chunks_v2_work_chunk_key" UNIQUE ("work_id", "chunk_index");



ALTER TABLE ONLY "public"."work_embeddings_v2"
    ADD CONSTRAINT "work_embeddings_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_embeddings_v2"
    ADD CONSTRAINT "work_embeddings_v2_work_id_key" UNIQUE ("work_id");



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_image_url_key" UNIQUE ("image_url");



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_pkey" PRIMARY KEY ("work_id");



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_series_episode_unique" UNIQUE ("series_id", "episode_number") DEFERRABLE INITIALLY DEFERRED;



CREATE INDEX "idx_popular_works_category" ON "_internal"."popular_works_snapshot" USING "btree" ("category");



CREATE INDEX "idx_popular_works_popularity_rank" ON "_internal"."popular_works_snapshot" USING "btree" ("popularity_rank");



CREATE INDEX "idx_popular_works_tags" ON "_internal"."popular_works_snapshot" USING "gin" ("tags");



CREATE UNIQUE INDEX "idx_popular_works_work_id" ON "_internal"."popular_works_snapshot" USING "btree" ("work_id");



CREATE INDEX "idx_user_preferences_cache_behavior_score" ON "_internal"."user_preferences_cache" USING "btree" ("total_behavior_score" DESC);



CREATE UNIQUE INDEX "idx_user_preferences_cache_user_id" ON "_internal"."user_preferences_cache" USING "btree" ("user_id");



CREATE INDEX "idx_user_similarity_level" ON "_internal"."user_similarity_matrix" USING "btree" ("similarity_level");



CREATE INDEX "idx_user_similarity_user1" ON "_internal"."user_similarity_matrix" USING "btree" ("user1_id", "jaccard_similarity" DESC);



CREATE INDEX "idx_user_similarity_user2" ON "_internal"."user_similarity_matrix" USING "btree" ("user2_id", "jaccard_similarity" DESC);



CREATE INDEX "idx_work_embeddings_v2_description_cosine" ON "_internal"."work_embeddings_v2" USING "ivfflat" ("description_embedding" "public"."vector_cosine_ops") WITH ("lists"='10') WHERE (("processing_status" = 'completed'::"text") AND ("description_embedding" IS NOT NULL));



CREATE INDEX "idx_work_embeddings_v2_last_processed_at" ON "_internal"."work_embeddings_v2" USING "btree" ("last_processed_at");



CREATE INDEX "idx_work_embeddings_v2_status" ON "_internal"."work_embeddings_v2" USING "btree" ("processing_status");



CREATE INDEX "idx_work_embeddings_v2_tags_cosine" ON "_internal"."work_embeddings_v2" USING "ivfflat" ("tags_embedding" "public"."vector_cosine_ops") WITH ("lists"='10') WHERE (("processing_status" = 'completed'::"text") AND ("tags_embedding" IS NOT NULL));



CREATE INDEX "idx_work_embeddings_v2_title_cosine" ON "_internal"."work_embeddings_v2" USING "ivfflat" ("title_embedding" "public"."vector_cosine_ops") WITH ("lists"='10') WHERE (("processing_status" = 'completed'::"text") AND ("title_embedding" IS NOT NULL));



CREATE INDEX "idx_work_embeddings_v2_updated_at" ON "_internal"."work_embeddings_v2" USING "btree" ("updated_at");



CREATE INDEX "idx_work_embeddings_v2_work_id" ON "_internal"."work_embeddings_v2" USING "btree" ("work_id");



CREATE INDEX "follows_followed_status_idx" ON "public"."follows" USING "btree" ("followed_id", "status");



CREATE INDEX "follows_follower_status_idx" ON "public"."follows" USING "btree" ("follower_id", "status");



CREATE INDEX "follows_status_idx" ON "public"."follows" USING "btree" ("status");



CREATE INDEX "idx_backgrounds_core_trait_1" ON "public"."backgrounds" USING "btree" ("core_trait_1");



CREATE INDEX "idx_backgrounds_core_trait_2" ON "public"."backgrounds" USING "btree" ("core_trait_2");



CREATE INDEX "idx_backgrounds_core_trait_3" ON "public"."backgrounds" USING "btree" ("core_trait_3");



CREATE INDEX "idx_backgrounds_created_at" ON "public"."backgrounds" USING "btree" ("created_at");



CREATE INDEX "idx_backgrounds_creative_style" ON "public"."backgrounds" USING "btree" ("creative_style");



CREATE INDEX "idx_backgrounds_frequency" ON "public"."backgrounds" USING "btree" ("frequency");



CREATE INDEX "idx_backgrounds_generation_date" ON "public"."backgrounds" USING "btree" ("generation_date");



CREATE INDEX "idx_backgrounds_genre_frequency" ON "public"."backgrounds" USING "btree" ("literary_genre", "frequency");



CREATE INDEX "idx_backgrounds_interaction_level" ON "public"."backgrounds" USING "btree" ("interaction_level");



CREATE INDEX "idx_backgrounds_literary_genre" ON "public"."backgrounds" USING "btree" ("literary_genre");



CREATE INDEX "idx_backgrounds_narrative_point" ON "public"."backgrounds" USING "btree" ("narrative_point");



CREATE INDEX "idx_backgrounds_pen_name" ON "public"."backgrounds" USING "btree" ("username");



CREATE INDEX "idx_backgrounds_platform_preference" ON "public"."backgrounds" USING "btree" ("platform_preference");



CREATE INDEX "idx_backgrounds_posting_time" ON "public"."backgrounds" USING "btree" ("posting_time");



CREATE INDEX "idx_backgrounds_social_attitude" ON "public"."backgrounds" USING "btree" ("social_attitude");



CREATE INDEX "idx_backgrounds_theme_genre_1" ON "public"."backgrounds" USING "btree" ("theme_genre_1");



CREATE INDEX "idx_backgrounds_theme_genre_2" ON "public"."backgrounds" USING "btree" ("theme_genre_2");



CREATE INDEX "idx_backgrounds_trait_interaction" ON "public"."backgrounds" USING "btree" ("core_trait_1", "interaction_level");



CREATE INDEX "idx_backgrounds_user_id" ON "public"."backgrounds" USING "btree" ("id");



CREATE INDEX "idx_batch_mappings_author_id" ON "public"."batch_mappings" USING "btree" ("author_id");



CREATE INDEX "idx_batch_mappings_batch_id" ON "public"."batch_mappings" USING "btree" ("batch_id");



CREATE INDEX "idx_batch_processing_logs_batch_id" ON "public"."batch_processing_logs" USING "btree" ("batch_id");



CREATE INDEX "idx_batch_processing_logs_created_at" ON "public"."batch_processing_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bookmark_folders_is_private" ON "public"."bookmark_folders" USING "btree" ("is_private") WHERE ("is_private" = false);



CREATE INDEX "idx_bookmark_folders_is_system" ON "public"."bookmark_folders" USING "btree" ("is_system") WHERE ("is_system" = true);



CREATE INDEX "idx_bookmark_folders_sort_order" ON "public"."bookmark_folders" USING "btree" ("sort_order");



CREATE INDEX "idx_bookmark_folders_user_id" ON "public"."bookmark_folders" USING "btree" ("user_id");



CREATE INDEX "idx_bookmarks_folder" ON "public"."bookmarks" USING "btree" ("folder") WHERE ("folder" IS NOT NULL);



CREATE INDEX "idx_bookmarks_folder_sort_order" ON "public"."bookmarks" USING "btree" ("user_id", "folder", "sort_order");



CREATE INDEX "idx_bookmarks_folder_user" ON "public"."bookmarks" USING "btree" ("folder", "user_id", "is_private") WHERE ("is_private" = false);



CREATE INDEX "idx_bookmarks_is_private" ON "public"."bookmarks" USING "btree" ("is_private") WHERE ("is_private" IS NOT NULL);



CREATE INDEX "idx_bookmarks_user_work" ON "public"."bookmarks" USING "btree" ("user_id", "work_id");



CREATE INDEX "idx_bookmarks_user_work_optimized" ON "public"."bookmarks" USING "btree" ("user_id", "work_id", "bookmarked_at" DESC);



CREATE INDEX "idx_contact_messages_admin_view" ON "public"."contact_messages" USING "btree" ("created_at" DESC, "status", "category");



CREATE INDEX "idx_contact_messages_status" ON "public"."contact_messages" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_contact_messages_user_id" ON "public"."contact_messages" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_cron_execution_logs_job_name" ON "public"."cron_execution_logs" USING "btree" ("job_name", "created_at" DESC);



CREATE INDEX "idx_cron_execution_logs_status" ON "public"."cron_execution_logs" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_daily_view" ON "public"."views_log" USING "btree" ("user_id", "work_id", "viewed_date");



CREATE INDEX "idx_embedding_cost_tracking_created_at" ON "public"."embedding_cost_tracking" USING "btree" ("created_at");



CREATE INDEX "idx_embedding_cost_tracking_date" ON "public"."embedding_cost_tracking" USING "btree" ("date");



CREATE INDEX "idx_embedding_cost_tracking_model" ON "public"."embedding_cost_tracking" USING "btree" ("model_name");



CREATE INDEX "idx_embedding_processing_logs_v2_batch_id" ON "public"."embedding_processing_logs_v2" USING "btree" ("batch_id");



CREATE INDEX "idx_embedding_processing_logs_v2_created_at" ON "public"."embedding_processing_logs_v2" USING "btree" ("created_at");



CREATE INDEX "idx_embedding_processing_logs_v2_processing_type" ON "public"."embedding_processing_logs_v2" USING "btree" ("processing_type");



CREATE INDEX "idx_embedding_processing_logs_v2_status" ON "public"."embedding_processing_logs_v2" USING "btree" ("status");



CREATE INDEX "idx_embedding_processing_logs_v2_work_id" ON "public"."embedding_processing_logs_v2" USING "btree" ("work_id");



CREATE INDEX "idx_follows_public_profiles" ON "public"."follows" USING "btree" ("follower_id", "followed_id", "status") WHERE (("status")::"text" = 'approved'::"text");



CREATE INDEX "idx_impressions_anonymous_analysis" ON "public"."impressions_log" USING "btree" ("session_id", "impression_type", "impressed_at") WHERE (("user_id" IS NULL) AND ("session_id" IS NOT NULL));



CREATE INDEX "idx_impressions_session" ON "public"."impressions_log" USING "btree" ("session_id", "impressed_at");



CREATE UNIQUE INDEX "idx_impressions_session_work_unique" ON "public"."impressions_log" USING "btree" ("session_id", "work_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_impressions_type_context" ON "public"."impressions_log" USING "btree" ("impression_type", "page_context");



CREATE INDEX "idx_impressions_user_time" ON "public"."impressions_log" USING "btree" ("user_id", "impressed_at") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_impressions_work_time" ON "public"."impressions_log" USING "btree" ("work_id", "impressed_at");



CREATE INDEX "idx_likes_user_work" ON "public"."likes" USING "btree" ("user_id", "work_id");



CREATE INDEX "idx_reading_bookmarks_user_updated" ON "public"."reading_bookmarks" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_reading_progress_completed" ON "public"."reading_progress" USING "btree" ("completed_at") WHERE ("completed_at" IS NOT NULL);



CREATE INDEX "idx_reading_progress_last_read_at" ON "public"."reading_progress" USING "btree" ("last_read_at");



CREATE INDEX "idx_reading_progress_user_id" ON "public"."reading_progress" USING "btree" ("user_id");



CREATE INDEX "idx_reading_progress_work_id" ON "public"."reading_progress" USING "btree" ("work_id");



CREATE INDEX "idx_series_id_title" ON "public"."series" USING "btree" ("id") INCLUDE ("title");



CREATE INDEX "idx_shares_shared_at" ON "public"."shares" USING "btree" ("shared_at" DESC);



CREATE INDEX "idx_shares_type" ON "public"."shares" USING "btree" ("share_type");



CREATE INDEX "idx_shares_user_id" ON "public"."shares" USING "btree" ("user_id");



CREATE INDEX "idx_shares_user_work" ON "public"."shares" USING "btree" ("user_id", "work_id");



CREATE INDEX "idx_shares_work_id" ON "public"."shares" USING "btree" ("work_id");



CREATE INDEX "idx_user_preferences_last_calculated" ON "public"."user_preferences" USING "btree" ("last_calculated_at");



CREATE INDEX "idx_user_preferences_total_works" ON "public"."user_preferences" USING "btree" ("total_works");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_vector" ON "public"."user_preferences" USING "ivfflat" ("preference_vector" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_users_followers_count" ON "public"."users" USING "btree" ("followers_count" DESC);



CREATE INDEX "idx_users_id_username" ON "public"."users" USING "btree" ("id") INCLUDE ("username");



CREATE INDEX "idx_users_total_likes" ON "public"."users" USING "btree" ("total_likes" DESC);



CREATE INDEX "idx_users_total_views" ON "public"."users" USING "btree" ("total_views" DESC);



CREATE INDEX "idx_users_works_count" ON "public"."users" USING "btree" ("works_count" DESC);



CREATE INDEX "idx_viewed_30min_slot" ON "public"."views_log" USING "btree" ("viewed_30min_slot");



CREATE INDEX "idx_views_log_work_viewed" ON "public"."views_log" USING "btree" ("work_id", "viewed_at");



CREATE INDEX "idx_work_content_chunks_v2_embedding_cosine" ON "public"."work_content_chunks_v2" USING "ivfflat" ("chunk_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_work_content_chunks_v2_work_id" ON "public"."work_content_chunks_v2" USING "btree" ("work_id");



CREATE INDEX "idx_work_content_chunks_v2_work_id_index" ON "public"."work_content_chunks_v2" USING "btree" ("work_id", "chunk_index");



CREATE INDEX "idx_work_embeddings_v2_description_cosine" ON "public"."work_embeddings_v2" USING "ivfflat" ("description_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_work_embeddings_v2_last_processed_at" ON "public"."work_embeddings_v2" USING "btree" ("last_processed_at");



CREATE INDEX "idx_work_embeddings_v2_status" ON "public"."work_embeddings_v2" USING "btree" ("processing_status");



CREATE INDEX "idx_work_embeddings_v2_tags_cosine" ON "public"."work_embeddings_v2" USING "ivfflat" ("tags_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_work_embeddings_v2_title_cosine" ON "public"."work_embeddings_v2" USING "ivfflat" ("title_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_work_embeddings_v2_updated_at" ON "public"."work_embeddings_v2" USING "btree" ("updated_at");



CREATE INDEX "idx_work_embeddings_v2_work_id" ON "public"."work_embeddings_v2" USING "btree" ("work_id");



CREATE INDEX "idx_work_views_30min" ON "public"."views_log" USING "btree" ("work_id", "viewed_30min_slot");



CREATE INDEX "idx_works_category_published_created_at" ON "public"."works" USING "btree" ("category", "is_published", "created_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_works_comments_count" ON "public"."works" USING "btree" ("comments_count" DESC);



CREATE INDEX "idx_works_content_quality_score" ON "public"."works" USING "btree" ("content_quality_score");



CREATE INDEX "idx_works_last_analyzed_at" ON "public"."works" USING "btree" ("last_analyzed_at");



CREATE INDEX "idx_works_likes_count" ON "public"."works" USING "btree" ("likes_count" DESC);



CREATE INDEX "idx_works_published_created_at" ON "public"."works" USING "btree" ("is_published", "created_at" DESC) WHERE ("is_published" = true);



CREATE INDEX "idx_works_recent_views_24h" ON "public"."works" USING "btree" ("recent_views_24h" DESC);



CREATE INDEX "idx_works_recent_views_30d" ON "public"."works" USING "btree" ("recent_views_30d" DESC);



CREATE INDEX "idx_works_recent_views_7d" ON "public"."works" USING "btree" ("recent_views_7d" DESC);



CREATE INDEX "idx_works_score_normalized" ON "public"."works" USING "btree" ("score_normalized");



CREATE INDEX "idx_works_series_episode" ON "public"."works" USING "btree" ("series_id", "episode_number") WHERE (("series_id" IS NOT NULL) AND ("episode_number" IS NOT NULL));



CREATE INDEX "idx_works_total_ratings" ON "public"."works" USING "btree" ("total_ratings");



CREATE INDEX "idx_works_trend_score" ON "public"."works" USING "btree" ("trend_score" DESC);



CREATE INDEX "idx_works_views_count" ON "public"."works" USING "btree" ("views_count" DESC);



CREATE INDEX "notifications_user_id_created_at_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_user_id_is_read_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE UNIQUE INDEX "unique_30min_view" ON "public"."views_log" USING "btree" ("user_id", "work_id", "viewed_30min_slot");



CREATE OR REPLACE TRIGGER "trigger_work_embeddings_v2_updated_at" BEFORE UPDATE ON "_internal"."work_embeddings_v2" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_auto_queue_embedding" AFTER INSERT OR UPDATE ON "public"."works" FOR EACH ROW EXECUTE FUNCTION "public"."auto_queue_embedding"();



CREATE OR REPLACE TRIGGER "trigger_bookmarks_updated_at" BEFORE UPDATE ON "public"."bookmarks" FOR EACH ROW EXECUTE FUNCTION "public"."update_bookmarks_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_embedding_cost_tracking_updated_at" BEFORE UPDATE ON "public"."embedding_cost_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_set_updated_at" BEFORE UPDATE ON "public"."works" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_shares_updated_at" BEFORE UPDATE ON "public"."shares" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_follow_counts" AFTER INSERT OR DELETE OR UPDATE ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."update_follow_counts"();



CREATE OR REPLACE TRIGGER "trigger_update_reading_progress_updated_at" BEFORE UPDATE ON "public"."reading_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_reading_progress_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_stats" AFTER UPDATE ON "public"."works" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_stats_from_works"();



CREATE OR REPLACE TRIGGER "trigger_update_work_comments_delete" AFTER DELETE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_comments_count"();



CREATE OR REPLACE TRIGGER "trigger_update_work_comments_insert" AFTER INSERT ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_comments_count"();



CREATE OR REPLACE TRIGGER "trigger_update_work_comments_update" AFTER UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_comments_count"();



CREATE OR REPLACE TRIGGER "trigger_update_work_likes_delete" AFTER DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_update_work_likes_insert" AFTER INSERT ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_update_work_trend_score" BEFORE UPDATE ON "public"."works" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_trend_score_on_likes"();



CREATE OR REPLACE TRIGGER "trigger_update_work_views_delete" AFTER DELETE ON "public"."views_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_views_count"();



CREATE OR REPLACE TRIGGER "trigger_update_work_views_insert" AFTER INSERT ON "public"."views_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_views_count"();



CREATE OR REPLACE TRIGGER "trigger_update_work_views_on_delete" AFTER DELETE ON "public"."views_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_view_stats_on_delete"();



CREATE OR REPLACE TRIGGER "trigger_update_work_views_on_insert" AFTER INSERT ON "public"."views_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_view_stats"();



CREATE OR REPLACE TRIGGER "trigger_update_works_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."works" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_works_count"();



CREATE OR REPLACE TRIGGER "trigger_user_preferences_stats_update" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_preference_stats"();



CREATE OR REPLACE TRIGGER "trigger_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_work_content_chunks_v2_updated_at" BEFORE UPDATE ON "public"."work_content_chunks_v2" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_work_embeddings_v2_updated_at" BEFORE UPDATE ON "public"."work_embeddings_v2" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_backgrounds_updated_at" BEFORE UPDATE ON "public"."backgrounds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "_internal"."work_embeddings_v2"
    ADD CONSTRAINT "work_embeddings_v2_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."backgrounds"
    ADD CONSTRAINT "backgrounds_user_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_mappings"
    ADD CONSTRAINT "batch_mappings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmark_folders"
    ADD CONSTRAINT "bookmark_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embedding_processing_logs_v2"
    ADD CONSTRAINT "embedding_processing_logs_v2_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impressions_log"
    ADD CONSTRAINT "impressions_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impressions_log"
    ADD CONSTRAINT "impressions_log_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_user_id_fkey" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_work_id_fkey" FOREIGN KEY ("related_work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_bookmarks"
    ADD CONSTRAINT "reading_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_bookmarks"
    ADD CONSTRAINT "reading_bookmarks_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_progress"
    ADD CONSTRAINT "reading_progress_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."shares"
    ADD CONSTRAINT "shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shares"
    ADD CONSTRAINT "shares_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."views_log"
    ADD CONSTRAINT "views_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."views_log"
    ADD CONSTRAINT "views_log_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_content_chunks_v2"
    ADD CONSTRAINT "work_content_chunks_v2_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_embeddings_v2"
    ADD CONSTRAINT "work_embeddings_v2_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("work_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id");



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Allow read access for admin users only" ON "public"."backgrounds" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Allow update for admin users" ON "public"."backgrounds" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."works" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."works" FOR SELECT USING (true);



CREATE POLICY "Users can update their own works" ON "public"."works" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."backgrounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch_processing_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookmark_folders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookmark_folders_delete_own" ON "public"."bookmark_folders" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "bookmark_folders_insert_own" ON "public"."bookmark_folders" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "bookmark_folders_select_system_or_own_or_public" ON "public"."bookmark_folders" FOR SELECT USING ((("is_system" = true) OR ("user_id" = "auth"."uid"()) OR (("is_private" = false) AND (EXISTS ( SELECT 1
   FROM "public"."bookmarks" "b"
  WHERE ((("b"."folder")::"text" = ("bookmark_folders"."folder_key")::"text") AND ("b"."user_id" = "bookmark_folders"."user_id") AND ("b"."is_private" = false))
 LIMIT 1)))));



CREATE POLICY "bookmark_folders_update_own" ON "public"."bookmark_folders" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookmarks_delete_own" ON "public"."bookmarks" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "bookmarks_insert_own" ON "public"."bookmarks" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "bookmarks_select_public_or_own" ON "public"."bookmarks" FOR SELECT USING ((("is_private" = false) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "bookmarks_update_own" ON "public"."bookmarks" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_messages_insert_anyone" ON "public"."contact_messages" FOR INSERT WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("auth"."uid"() IS NULL) AND ("user_id" IS NULL))));



CREATE POLICY "contact_messages_select_own_only" ON "public"."contact_messages" FOR SELECT USING ((("user_id" IS NOT NULL) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."cron_execution_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embedding_cost_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embedding_processing_logs_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follows_delete_own" ON "public"."follows" FOR DELETE USING (("follower_id" = "auth"."uid"()));



CREATE POLICY "follows_insert_own" ON "public"."follows" FOR INSERT WITH CHECK ((("follower_id" = "auth"."uid"()) AND ("follower_id" <> "followed_id")));



CREATE POLICY "follows_select_related_or_public_profiles" ON "public"."follows" FOR SELECT USING ((("follower_id" = "auth"."uid"()) OR ("followed_id" = "auth"."uid"()) OR ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "follows"."follower_id") AND ("users"."public_profile" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "follows"."followed_id") AND ("users"."public_profile" = true)))))));



CREATE POLICY "follows_update_related" ON "public"."follows" FOR UPDATE USING ((("follower_id" = "auth"."uid"()) OR ("followed_id" = "auth"."uid"()))) WITH CHECK ((("follower_id" = "auth"."uid"()) OR ("followed_id" = "auth"."uid"())));



ALTER TABLE "public"."impressions_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "impressions_log_insert_anyone" ON "public"."impressions_log" FOR INSERT WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())) OR (("auth"."uid"() IS NULL) AND ("user_id" IS NULL))));



CREATE POLICY "impressions_log_select_own_only" ON "public"."impressions_log" FOR SELECT USING ((("user_id" IS NOT NULL) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "likes_delete_own" ON "public"."likes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "likes_insert_own" ON "public"."likes" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "likes_select_all" ON "public"."likes" FOR SELECT USING (true);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_insert_for_self" ON "public"."notifications" FOR INSERT WITH CHECK (("user_id" IS NOT NULL));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reading_bookmarks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reading_bookmarks_delete_own" ON "public"."reading_bookmarks" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reading_bookmarks_insert_own" ON "public"."reading_bookmarks" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "reading_bookmarks_select_own" ON "public"."reading_bookmarks" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reading_bookmarks_update_own" ON "public"."reading_bookmarks" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reading_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reading_progress_delete_own" ON "public"."reading_progress" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reading_progress_insert_own" ON "public"."reading_progress" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "reading_progress_select_own" ON "public"."reading_progress" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reading_progress_update_own" ON "public"."reading_progress" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_delete_own" ON "public"."reviews" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reviews_insert_own" ON "public"."reviews" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "reviews_select_all" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "reviews_update_own" ON "public"."reviews" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."series" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "series_delete_own" ON "public"."series" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "series_insert_own" ON "public"."series" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "series_select_all" ON "public"."series" FOR SELECT USING (true);



CREATE POLICY "series_update_own" ON "public"."series" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."shares" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shares_insert_own" ON "public"."shares" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "shares_select_own" ON "public"."shares" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_self" ON "public"."users" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_select_public" ON "public"."users" FOR SELECT USING ((("public_profile" = true) OR ("id" = "auth"."uid"())));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."views_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "views_log_insert_own" ON "public"."views_log" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "views_log_select_own" ON "public"."views_log" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."work_content_chunks_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_embeddings_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."works" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "works_delete_own" ON "public"."works" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "works_insert_own" ON "public"."works" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "works_select_published_or_own" ON "public"."works" FOR SELECT USING ((("is_published" = true) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "works_update_own" ON "public"."works" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "_internal" TO "service_role";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "_internal"."cron_refresh_recommendations"() TO "anon";
GRANT ALL ON FUNCTION "_internal"."cron_refresh_recommendations"() TO "authenticated";
GRANT ALL ON FUNCTION "_internal"."cron_refresh_recommendations"() TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."approve_follow_request"("p_follow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_follow_request"("p_follow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_follow_request"("p_follow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_works"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_works"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_works"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_queue_embedding"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_queue_embedding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_queue_embedding"() TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bayesian_score"("work_rating" numeric, "work_total_ratings" integer, "global_avg_rating" numeric, "min_ratings_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bayesian_score"("work_rating" numeric, "work_total_ratings" integer, "global_avg_rating" numeric, "min_ratings_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bayesian_score"("work_rating" numeric, "work_total_ratings" integer, "global_avg_rating" numeric, "min_ratings_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_engagement_score_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_user_works"("p_viewer_id" "uuid", "p_target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_user_works"("p_viewer_id" "uuid", "p_target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_user_works"("p_viewer_id" "uuid", "p_target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_cron_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_cron_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_cron_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_test_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."clear_test_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_test_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_related_user_id" "uuid", "p_related_work_id" "uuid", "p_action_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_related_user_id" "uuid", "p_related_work_id" "uuid", "p_action_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_related_user_id" "uuid", "p_related_work_id" "uuid", "p_action_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cron_refresh_recommendations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cron_refresh_recommendations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cron_refresh_recommendations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_http_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_http_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_http_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_vault_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_vault_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_vault_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_users"("target_user_id" "uuid", "min_common_works" integer, "similarity_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_users"("target_user_id" "uuid", "min_common_works" integer, "similarity_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_users"("target_user_id" "uuid", "min_common_works" integer, "similarity_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_works_by_content"("target_work_id" "uuid", "similarity_threshold" double precision, "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_works_by_content"("target_work_id" "uuid", "similarity_threshold" double precision, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_works_by_content"("target_work_id" "uuid", "similarity_threshold" double precision, "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_readable_id"("length" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_readable_id"("length" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_readable_id"("length" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_adaptive_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_adaptive_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_adaptive_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cron_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cron_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cron_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_follow_status"("p_follower_id" "uuid", "p_followed_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_follow_status"("p_follower_id" "uuid", "p_followed_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_follow_status"("p_follower_id" "uuid", "p_followed_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hybrid_recommendations"("p_user_id" "uuid", "p_current_work_id" "uuid", "p_limit" integer, "p_user_weight" double precision, "p_content_weight" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_hybrid_recommendations"("p_user_id" "uuid", "p_current_work_id" "uuid", "p_limit" integer, "p_user_weight" double precision, "p_content_weight" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hybrid_recommendations"("p_user_id" "uuid", "p_current_work_id" "uuid", "p_limit" integer, "p_user_weight" double precision, "p_content_weight" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_personalized_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_personalized_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_personalized_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personalized_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personalized_recommendations_with_embeddings"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_embedding_weight" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_personalized_recommendations_with_embeddings"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_embedding_weight" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personalized_recommendations_with_embeddings"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_embedding_weight" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_personalized_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_personalized_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_personalized_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popular_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_strategy"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_popular_works_fallback"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_popular_works_fallback"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_works_fallback"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_works_fallback"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recommendation_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommendation_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommendation_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_similar_works_by_content"("p_current_work_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_similar_works_by_content"("p_current_work_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_similar_works_by_content"("p_current_work_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_simple_personalized"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_simple_personalized"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_simple_personalized"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_simple_popular"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_simple_popular"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_simple_popular"("p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_preferences_cache"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_preferences_cache"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_preferences_cache"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_preferences_cache"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_valid_recommendations"("p_user_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_valid_recommendations"("p_user_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_valid_recommendations"("p_user_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_views_uuid"("work_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_views_uuid"("work_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_views_uuid"("work_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_work_views"("work_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_work_views"("work_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_work_views"("work_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."manual_refresh_recommendations"() TO "anon";
GRANT ALL ON FUNCTION "public"."manual_refresh_recommendations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manual_refresh_recommendations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_followers_of_new_work"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_followers_of_new_work"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_followers_of_new_work"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_recommendation_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_recommendation_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_recommendation_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_follow_request"("p_follow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_follow_request"("p_follow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_follow_request"("p_follow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_works_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_works_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_works_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_embedding_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_embedding_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_embedding_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_embedding_processing_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_embedding_processing_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_embedding_processing_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_likes"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_likes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_likes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_reviews"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_reviews"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_reviews"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_user_preference_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_user_preference_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_user_preference_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_work_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_work_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_work_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bookmarks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bookmarks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bookmarks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_embedding_cost"("p_date" "date", "p_model_name" "text", "p_tokens_used" integer, "p_api_calls" integer, "p_cost_usd" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_embedding_cost"("p_date" "date", "p_model_name" "text", "p_tokens_used" integer, "p_api_calls" integer, "p_cost_usd" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_embedding_cost"("p_date" "date", "p_model_name" "text", "p_tokens_used" integer, "p_api_calls" integer, "p_cost_usd" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_follow_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_follow_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_follow_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reading_progress_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reading_progress_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reading_progress_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_stats_from_works"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_stats_from_works"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_stats_from_works"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_works_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_works_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_works_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_statistics"("work_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_statistics"("work_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_statistics"("work_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_stats"("p_work_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_stats"("p_work_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_stats"("p_work_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_trend_score_on_likes"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_trend_score_on_likes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_trend_score_on_likes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_view_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_view_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_view_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_view_stats_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_view_stats_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_view_stats_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_views_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_views_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_views_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."views_log" TO "anon";
GRANT ALL ON TABLE "public"."views_log" TO "authenticated";
GRANT ALL ON TABLE "public"."views_log" TO "service_role";



GRANT ALL ON TABLE "public"."works" TO "anon";
GRANT ALL ON TABLE "public"."works" TO "authenticated";
GRANT ALL ON TABLE "public"."works" TO "service_role";



GRANT ALL ON TABLE "_internal"."popular_works_snapshot" TO "anon";
GRANT ALL ON TABLE "_internal"."popular_works_snapshot" TO "authenticated";
GRANT ALL ON TABLE "_internal"."popular_works_snapshot" TO "service_role";



GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "_internal"."user_preferences_cache" TO "anon";
GRANT ALL ON TABLE "_internal"."user_preferences_cache" TO "authenticated";
GRANT ALL ON TABLE "_internal"."user_preferences_cache" TO "service_role";



GRANT ALL ON TABLE "_internal"."user_similarity_matrix" TO "anon";
GRANT ALL ON TABLE "_internal"."user_similarity_matrix" TO "authenticated";
GRANT ALL ON TABLE "_internal"."user_similarity_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."impressions_log" TO "anon";
GRANT ALL ON TABLE "public"."impressions_log" TO "authenticated";
GRANT ALL ON TABLE "public"."impressions_log" TO "service_role";















GRANT ALL ON TABLE "public"."backgrounds" TO "anon";
GRANT ALL ON TABLE "public"."backgrounds" TO "authenticated";
GRANT ALL ON TABLE "public"."backgrounds" TO "service_role";



GRANT ALL ON TABLE "public"."batch_mappings" TO "anon";
GRANT ALL ON TABLE "public"."batch_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."batch_processing_logs" TO "anon";
GRANT ALL ON TABLE "public"."batch_processing_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_processing_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bookmark_folders" TO "anon";
GRANT ALL ON TABLE "public"."bookmark_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmark_folders" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."cron_execution_logs" TO "anon";
GRANT ALL ON TABLE "public"."cron_execution_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_execution_logs" TO "service_role";



GRANT ALL ON TABLE "public"."embedding_cost_tracking" TO "anon";
GRANT ALL ON TABLE "public"."embedding_cost_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."embedding_cost_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."embedding_processing_logs_v2" TO "anon";
GRANT ALL ON TABLE "public"."embedding_processing_logs_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."embedding_processing_logs_v2" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inquiries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inquiries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inquiries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."reading_bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."reading_bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."reading_bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."reading_progress" TO "anon";
GRANT ALL ON TABLE "public"."reading_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."reading_progress" TO "service_role";



GRANT ALL ON TABLE "public"."series" TO "anon";
GRANT ALL ON TABLE "public"."series" TO "authenticated";
GRANT ALL ON TABLE "public"."series" TO "service_role";



GRANT ALL ON TABLE "public"."shares" TO "anon";
GRANT ALL ON TABLE "public"."shares" TO "authenticated";
GRANT ALL ON TABLE "public"."shares" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."whoami" TO "anon";
GRANT ALL ON TABLE "public"."whoami" TO "authenticated";
GRANT ALL ON TABLE "public"."whoami" TO "service_role";



GRANT ALL ON TABLE "public"."work_content_chunks_v2" TO "anon";
GRANT ALL ON TABLE "public"."work_content_chunks_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."work_content_chunks_v2" TO "service_role";



GRANT ALL ON TABLE "public"."work_embeddings_v2" TO "anon";
GRANT ALL ON TABLE "public"."work_embeddings_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."work_embeddings_v2" TO "service_role";



GRANT ALL ON TABLE "public"."works_published" TO "anon";
GRANT ALL ON TABLE "public"."works_published" TO "authenticated";
GRANT ALL ON TABLE "public"."works_published" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
