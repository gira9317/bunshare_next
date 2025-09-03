create table public.work_scores (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  work_id uuid not null,
  rating integer null,
  engagement_score numeric(5, 2) null default 0.00,
  favorited boolean null default false,
  read_to_end boolean null default false,
  time_spent_minutes numeric(8, 2) null default 0.00,
  added_to_library boolean null default false,
  shared boolean null default false,
  author_followed boolean null default false,
  continue_reading_clicked boolean null default false,
  last_interaction_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint work_scores_pkey primary key (id),
  constraint work_scores_user_id_work_id_key unique (user_id, work_id),
  constraint work_scores_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint work_scores_work_id_fkey foreign KEY (work_id) references works (work_id) on delete CASCADE,
  constraint work_scores_engagement_score_check check (
    (
      (engagement_score >= (0)::numeric)
      and (engagement_score <= (100)::numeric)
    )
  ),
  constraint work_scores_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_work_scores_user_id on public.work_scores using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_work_scores_work_id on public.work_scores using btree (work_id) TABLESPACE pg_default;

create index IF not exists idx_work_scores_rating on public.work_scores using btree (rating) TABLESPACE pg_default;

create index IF not exists idx_work_scores_engagement on public.work_scores using btree (engagement_score) TABLESPACE pg_default;

create index IF not exists idx_work_scores_favorited on public.work_scores using btree (favorited) TABLESPACE pg_default
where
  (favorited = true);

create index IF not exists idx_work_scores_last_interaction on public.work_scores using btree (last_interaction_at) TABLESPACE pg_default;

create trigger trigger_calculate_engagement_score BEFORE INSERT
or
update on work_scores for EACH row
execute FUNCTION calculate_engagement_score_trigger ();

create trigger trigger_work_scores_stats_update
after INSERT
or DELETE
or
update on work_scores for EACH row
execute FUNCTION trigger_update_work_stats ();

create trigger trigger_work_scores_updated_at BEFORE
update on work_scores for EACH row
execute FUNCTION set_updated_at ();