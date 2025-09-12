create materialized view public.popular_works_snapshot as
with
  work_stats as (
    select
      w.work_id,
      w.title,
      w.description,
      w.image_url,
      w.category,
      w.tags,
      w.user_id,
      w.created_at,
      COALESCE(w.views_count, 0::bigint) as views,
      COALESCE(w.likes_count, 0) as likes,
      COALESCE(w.comments_count, 0) as comments,
      COALESCE(w.trend_score, 0::numeric) as trend_score,
      COALESCE(
        (
          select
            count(*) as count
          from
            likes l
          where
            l.work_id = w.work_id
            and l.liked_at > (now() - '7 days'::interval)
        ),
        0::bigint
      ) as recent_likes,
      COALESCE(
        (
          select
            count(*) as count
          from
            views_log v
          where
            v.work_id = w.work_id
            and v.viewed_at > (now() - '7 days'::interval)
        ),
        0::bigint
      ) as recent_views,
      COALESCE(w.trend_score, 0::numeric) * 0.4 + COALESCE(w.likes_count, 0)::numeric * 0.3 + COALESCE(w.views_count, 0::bigint)::numeric / 10.0 * 0.2 + COALESCE(
        (
          select
            count(*) as count
          from
            likes l
          where
            l.work_id = w.work_id
            and l.liked_at > (now() - '7 days'::interval)
        ),
        0::bigint
      )::numeric * 0.1 as popularity_score
    from
      works w
    where
      w.is_published = true
  )
select
  ws.work_id,
  ws.title,
  ws.description,
  ws.image_url,
  ws.category,
  ws.tags,
  ws.user_id,
  ws.created_at,
  ws.views,
  ws.likes,
  ws.comments,
  ws.trend_score,
  ws.recent_likes,
  ws.recent_views,
  ws.popularity_score,
  u.username as author,
  u.username as author_username,
  row_number() over (
    order by
      ws.popularity_score desc,
      ws.created_at desc
  ) as popularity_rank,
  now() as snapshot_created_at
from
  work_stats ws
  join users u on u.id = ws.user_id
order by
  ws.popularity_score desc;