create table public.works (
  work_id uuid not null default gen_random_uuid (),
  user_id uuid null,
  title text null,
  category text null,
  views bigint null default '0'::bigint,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  scheduled_at timestamp with time zone null,
  tags text[] null,
  is_published boolean null,
  allow_comments boolean null,
  likes bigint null default '0'::bigint,
  comments bigint null default '0'::bigint,
  rating bigint null default '0'::bigint,
  content text null,
  image_url text null,
  description text null,
  series_id uuid null,
  episode_number integer null,
  use_series_image boolean null default false,
  is_adult_content boolean null default false,
  ai_analysis_data jsonb null,
  content_quality_score numeric(3, 2) null default 0.00,
  score_normalized numeric(3, 2) null default 0.00,
  total_ratings integer null default 0,
  average_rating numeric(3, 2) null default 0.00,
  last_analyzed_at timestamp with time zone null,
  analysis_version integer null default 1,
  recent_views_24h bigint null default 0,
  recent_views_7d bigint null default 0,
  trend_score numeric(5, 2) null default 0.00,
  view_stats_updated_at timestamp with time zone null default now(),
  likes_count integer null default 0,
  comments_count integer null default 0,
  views_count bigint null default 0,
  stats_last_updated timestamp with time zone null default now(),
  recent_views_30d bigint null default 0,
  constraint works_pkey primary key (work_id),
  constraint works_series_episode_unique unique (series_id, episode_number) deferrable initially DEFERRED,
  constraint works_image_url_key unique (image_url),
  constraint works_series_id_fkey foreign KEY (series_id) references series (id),
  constraint works_user_id_fkey foreign KEY (user_id) references users (id) on delete set null,
  constraint works_score_normalized_check check (
    (
      (score_normalized >= (0)::numeric)
      and (score_normalized <= (10)::numeric)
    )
  ),
  constraint works_content_quality_score_check check (
    (
      (content_quality_score >= (0)::numeric)
      and (content_quality_score <= (10)::numeric)
    )
  ),
  constraint works_average_rating_check check (
    (
      (average_rating >= (0)::numeric)
      and (average_rating <= (5)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_works_content_quality_score on public.works using btree (content_quality_score) TABLESPACE pg_default;

create index IF not exists idx_works_score_normalized on public.works using btree (score_normalized) TABLESPACE pg_default;

create index IF not exists idx_works_total_ratings on public.works using btree (total_ratings) TABLESPACE pg_default;

create index IF not exists idx_works_last_analyzed_at on public.works using btree (last_analyzed_at) TABLESPACE pg_default;

create index IF not exists idx_works_published_created_at on public.works using btree (is_published, created_at desc) TABLESPACE pg_default
where
  (is_published = true);

create index IF not exists idx_works_category_published_created_at on public.works using btree (category, is_published, created_at desc) TABLESPACE pg_default
where
  (is_published = true);

create index IF not exists idx_works_series_episode on public.works using btree (series_id, episode_number) TABLESPACE pg_default
where
  (
    (series_id is not null)
    and (episode_number is not null)
  );

create index IF not exists idx_works_recent_views_24h on public.works using btree (recent_views_24h desc) TABLESPACE pg_default;

create index IF not exists idx_works_recent_views_7d on public.works using btree (recent_views_7d desc) TABLESPACE pg_default;

create index IF not exists idx_works_trend_score on public.works using btree (trend_score desc) TABLESPACE pg_default;

create index IF not exists idx_works_likes_count on public.works using btree (likes_count desc) TABLESPACE pg_default;

create index IF not exists idx_works_comments_count on public.works using btree (comments_count desc) TABLESPACE pg_default;

create index IF not exists idx_works_views_count on public.works using btree (views_count desc) TABLESPACE pg_default;

create index IF not exists idx_works_recent_views_30d on public.works using btree (recent_views_30d desc) TABLESPACE pg_default;

create trigger trigger_auto_queue_embedding
after INSERT
or
update on works for EACH row
execute FUNCTION auto_queue_embedding ();

create trigger trigger_notify_work_published
after
update on works for EACH row
execute FUNCTION notify_followers_of_new_work ();

create trigger trigger_set_updated_at BEFORE
update on works for EACH row
execute FUNCTION set_updated_at ();

create trigger trigger_update_user_stats
after
update on works for EACH row
execute FUNCTION update_user_stats_from_works ();

create trigger trigger_update_work_trend_score BEFORE
update on works for EACH row
execute FUNCTION update_work_trend_score_on_likes ();

create trigger trigger_update_works_count
after INSERT
or DELETE
or
update on works for EACH row
execute FUNCTION update_user_works_count ();