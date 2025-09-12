create materialized view public.user_similarity_matrix as
with
  user_interactions as (
    select
      likes.user_id,
      likes.work_id,
      'like'::text as interaction_type,
      3 as weight
    from
      likes
    union all
    select
      bookmarks.user_id,
      bookmarks.work_id,
      'bookmark'::text as interaction_type,
      4 as weight
    from
      bookmarks
    union all
    select
      reviews.user_id,
      reviews.work_id,
      'review'::text as interaction_type,
      2 as weight
    from
      reviews
  ),
  user_pairs as (
    select
      u1.user_id as user1_id,
      u2.user_id as user2_id,
      count(distinct u1.work_id) as common_works,
      sum(u1.weight + u2.weight) as interaction_strength,
      count(distinct u1.work_id)::numeric * 1.0 / NULLIF(
        (
          (
            select
              count(distinct user_interactions.work_id) as count
            from
              user_interactions
            where
              user_interactions.user_id = u1.user_id
          )
        ) + (
          (
            select
              count(distinct user_interactions.work_id) as count
            from
              user_interactions
            where
              user_interactions.user_id = u2.user_id
          )
        ) - count(distinct u1.work_id),
        0
      )::numeric as jaccard_similarity
    from
      user_interactions u1
      join user_interactions u2 on u1.work_id = u2.work_id
      and u1.user_id < u2.user_id
    group by
      u1.user_id,
      u2.user_id
    having
      count(distinct u1.work_id) >= 3
  )
select
  user1_id,
  user2_id,
  common_works,
  interaction_strength,
  jaccard_similarity,
  case
    when jaccard_similarity >= 0.3 then 'high'::text
    when jaccard_similarity >= 0.1 then 'medium'::text
    else 'low'::text
  end as similarity_level,
  now() as calculated_at
from
  user_pairs
where
  jaccard_similarity > 0.05;