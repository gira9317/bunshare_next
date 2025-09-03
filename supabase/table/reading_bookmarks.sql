create table public.reading_bookmarks (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  work_id uuid not null,
  scroll_position integer not null default 0,
  reading_progress numeric(5, 2) not null default 0.00,
  bookmark_text text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint reading_bookmarks_pkey primary key (id),
  constraint reading_bookmarks_user_work_unique unique (user_id, work_id),
  constraint reading_bookmarks_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint reading_bookmarks_work_id_fkey foreign KEY (work_id) references works (work_id) on delete CASCADE
) TABLESPACE pg_default;