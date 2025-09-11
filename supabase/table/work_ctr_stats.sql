create view public.work_ctr_stats as
with
  impression_stats as (
    select
      impressions_log.work_id,
      count(*) as impression_count,
      avg(impressions_log.intersection_ratio) as avg_intersection_ratio,
      avg(impressions_log.display_duration) as avg_display_duration
    from
      impressions_log
    where
      impressions_log.impressed_at >= (now() - '30 days'::interval)
      and impressions_log.intersection_ratio >= 0.5
      and impressions_log.display_duration >= 1000
    group by
      impressions_log.work_id
  ),
  click_stats as (
    select
      views_log.work_id,
      count(distinct views_log.user_id) as unique_clicks,
      count(*) as total_clicks
    from
      views_log
    where
      views_log.viewed_at >= (now() - '30 days'::interval)
    group by
      views_log.work_id
  )
select
  i.work_id,
  i.impression_count,
  COALESCE(c.unique_clicks, 0::bigint) as unique_clicks,
  COALESCE(c.total_clicks, 0::bigint) as total_clicks,
  case
    when i.impression_count > 0 then COALESCE(c.unique_clicks, 0::bigint)::double precision / i.impression_count::double precision
    else 0.0::double precision
  end as ctr_unique,
  case
    when i.impression_count > 0 then COALESCE(c.total_clicks, 0::bigint)::double precision / i.impression_count::double precision
    else 0.0::double precision
  end as ctr_total,
  i.avg_intersection_ratio,
  i.avg_display_duration
from
  impression_stats i
  left join click_stats c on i.work_id = c.work_id;