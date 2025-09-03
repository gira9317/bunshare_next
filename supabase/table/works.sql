create table public.works (
  work_id uuid not null default gen_random_uuid (),
  user_id uuid null,
  title text null,
  category text null,
  views bigint null default '0'::bigint,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  scheduled_at timestamp without time zone null,
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
  constraint works_pkey primary key (work_id),
  constraint works_image_url_key unique (image_url),
  constraint works_series_id_fkey foreign KEY (series_id) references series (id),
  constraint works_user_id_fkey foreign KEY (user_id) references users (id) on delete set null,
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
  ),
  constraint works_score_normalized_check check (
    (
      (score_normalized >= (0)::numeric)
      and (score_normalized <= (10)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_works_content_quality_score on public.works using btree (content_quality_score) TABLESPACE pg_default;

create index IF not exists idx_works_score_normalized on public.works using btree (score_normalized) TABLESPACE pg_default;

create index IF not exists idx_works_total_ratings on public.works using btree (total_ratings) TABLESPACE pg_default;

create index IF not exists idx_works_last_analyzed_at on public.works using btree (last_analyzed_at) TABLESPACE pg_default;

create trigger trigger_notify_work_published
after
update on works for EACH row
execute FUNCTION notify_followers_of_new_work ();

create trigger trigger_set_updated_at BEFORE
update on works for EACH row
execute FUNCTION set_updated_at ();