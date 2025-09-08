create table public.views_log (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  work_id uuid not null,
  viewed_at timestamp with time zone null default now(),
  viewed_date date not null,
  viewed_30min_slot timestamp with time zone not null default (
    date_trunc('hour', now()) + 
    (floor(extract(minute from now()) / 30) * interval '30 minutes')
  ),
  constraint views_log_pkey primary key (id),
  constraint views_log_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint views_log_work_id_fkey foreign KEY (work_id) references works (work_id) on delete CASCADE
) TABLESPACE pg_default;

-- 30分単位の重複防止インデックス
create unique INDEX IF not exists unique_30min_view on public.views_log using btree (user_id, work_id, viewed_30min_slot) TABLESPACE pg_default;

-- 従来の日単位インデックスも残す（既存データとの互換性）
create INDEX IF not exists idx_daily_view on public.views_log using btree (user_id, work_id, viewed_date) TABLESPACE pg_default;