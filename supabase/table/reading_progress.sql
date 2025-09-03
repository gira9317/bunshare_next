create table public.reading_progress (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  work_id uuid not null,
  progress_percentage numeric(5, 2) null default 0.00,
  last_read_position integer null default 0,
  total_content_length integer null default 0,
  reading_time_seconds integer null default 0,
  last_read_at timestamp with time zone null default now(),
  first_read_at timestamp with time zone null default now(),
  completed_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint reading_progress_pkey primary key (id),
  constraint reading_progress_user_id_work_id_key unique (user_id, work_id),
  constraint reading_progress_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint reading_progress_work_id_fkey foreign KEY (work_id) references works (work_id) on delete CASCADE,
  constraint reading_progress_progress_percentage_check check (
    (
      (progress_percentage >= (0)::numeric)
      and (progress_percentage <= (100)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_reading_progress_user_id on public.reading_progress using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_reading_progress_work_id on public.reading_progress using btree (work_id) TABLESPACE pg_default;

create index IF not exists idx_reading_progress_last_read_at on public.reading_progress using btree (last_read_at) TABLESPACE pg_default;

create index IF not exists idx_reading_progress_completed on public.reading_progress using btree (completed_at) TABLESPACE pg_default
where
  (completed_at is not null);

create trigger trigger_update_reading_progress_updated_at BEFORE
update on reading_progress for EACH row
execute FUNCTION update_reading_progress_updated_at ();