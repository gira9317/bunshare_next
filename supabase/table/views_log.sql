create table public.views_log (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  work_id uuid not null,
  viewed_at timestamp with time zone null default now(),
  viewed_date date not null,
  constraint views_log_pkey primary key (id),
  constraint views_log_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint views_log_work_id_fkey foreign KEY (work_id) references works (work_id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists unique_daily_view on public.views_log using btree (user_id, work_id, viewed_date) TABLESPACE pg_default;