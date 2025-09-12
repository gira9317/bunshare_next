create materialized view public.user_preferences_cache as
select
  user_id,
  array_agg(distinct category) filter (
    where
      category is not null
  ) as preferred_categories,
  array_agg(distinct tag) filter (
    where
      tag is not null
  ) as preferred_tags,
  sum(interaction_weight) as total_behavior_score,
  max(last_interaction) as last_updated
from
  (
    select
      l.user_id,
      w.category,
      unnest(w.tags) as tag,
      15 as interaction_weight,
      l.liked_at as last_interaction
    from
      likes l
      join works w on w.work_id = l.work_id
    where
      l.liked_at > (now() - '90 days'::interval)
    union all
    select
      b.user_id,
      w.category,
      unnest(w.tags) as tag,
      20 as interaction_weight,
      b.bookmarked_at as last_interaction
    from
      bookmarks b
      join works w on w.work_id = b.work_id
    where
      b.bookmarked_at > (now() - '90 days'::interval)
    union all
    select
      r.user_id,
      w.category,
      unnest(w.tags) as tag,
      12 as interaction_weight,
      r.created_at as last_interaction
    from
      reviews r
      join works w on w.work_id = r.work_id
    where
      r.created_at > (now() - '90 days'::interval)
    union all
    select
      v.user_id,
      w.category,
      unnest(w.tags) as tag,
      v.view_count * 2 as interaction_weight,
      max(v.viewed_at) as last_interaction
    from
      (
        select
          views_log.user_id,
          views_log.work_id,
          count(*) as view_count,
          max(views_log.viewed_at) as viewed_at
        from
          views_log
        where
          views_log.viewed_at > (now() - '90 days'::interval)
        group by
          views_log.user_id,
          views_log.work_id
        having
          count(*) >= 2
      ) v
      join works w on w.work_id = v.work_id
    group by
      v.user_id,
      w.category,
      (unnest(w.tags)),
      v.view_count
  ) user_interactions
group by
  user_id;