create table public.bookmark_folders (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  folder_name character varying(50) not null,
  folder_key character varying(50) not null,
  color character varying(7) null default '#8b5cf6'::character varying,
  icon character varying(50) null default 'folder'::character varying,
  sort_order integer null default 0,
  is_system boolean null default false,
  created_at timestamp with time zone null default now(),
  is_private boolean null default false,
  constraint bookmark_folders_pkey primary key (id),
  constraint bookmark_folders_user_key_unique unique (user_id, folder_key),
  constraint bookmark_folders_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_bookmark_folders_user_id on public.bookmark_folders using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_bookmark_folders_sort_order on public.bookmark_folders using btree (sort_order) TABLESPACE pg_default;