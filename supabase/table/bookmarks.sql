create table public.bookmarks (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  work_id uuid not null,
  bookmarked_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  folder character varying(50) null default 'default'::character varying,
  memo text null,
  is_private boolean null default false,
  sort_order integer null default 0,
  constraint bookmarks_pkey primary key (id),
  constraint bookmarks_user_work_folder_unique unique (user_id, work_id, folder)
) TABLESPACE pg_default;

create index IF not exists idx_bookmarks_folder on public.bookmarks using btree (folder) TABLESPACE pg_default
where
  (folder is not null);

create index IF not exists idx_bookmarks_is_private on public.bookmarks using btree (is_private) TABLESPACE pg_default
where
  (is_private is not null);

create index IF not exists idx_bookmarks_user_work on public.bookmarks using btree (user_id, work_id) TABLESPACE pg_default;

create index IF not exists idx_bookmarks_folder_sort_order on public.bookmarks using btree (user_id, folder, sort_order) TABLESPACE pg_default;

create index IF not exists idx_bookmarks_user_work_optimized on public.bookmarks using btree (user_id, work_id, bookmarked_at desc) TABLESPACE pg_default;

create trigger trigger_bookmarks_updated_at BEFORE
update on bookmarks for EACH row
execute FUNCTION update_bookmarks_updated_at ();