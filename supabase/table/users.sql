create table public.users (
  email text not null,
  username text null,
  provider text null,
  sign_in_time timestamp without time zone null default now(),
  id uuid not null default gen_random_uuid (),
  birth_date date null,
  gender text null,
  bio text null,
  agree_marketing boolean null default false,
  role text null default 'user'::text,
  avatar_img_url text null,
  header_img_url text null,
  custom_user_id text null,
  website_url text[] null,
  public_profile boolean null default true,
  follow_approval boolean null default false,
  like_notification boolean null default true,
  comment_notification boolean null default true,
  follow_notification boolean null default true,
  email_notification boolean null default false,
  hide_bookmark_modal boolean null default false,
  works_count integer null default 0,
  followers_count integer null default 0,
  following_count integer null default 0,
  total_likes integer null default 0,
  total_views bigint null default 0,
  total_comments integer null default 0,
  stats_updated_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint user_email_key unique (email),
  constraint users_custom_user_id_key unique (custom_user_id)
) TABLESPACE pg_default;

create index IF not exists idx_users_id_username on public.users using btree (id) INCLUDE (username) TABLESPACE pg_default;

create index IF not exists idx_users_works_count on public.users using btree (works_count desc) TABLESPACE pg_default;

create index IF not exists idx_users_followers_count on public.users using btree (followers_count desc) TABLESPACE pg_default;

create index IF not exists idx_users_total_likes on public.users using btree (total_likes desc) TABLESPACE pg_default;

create index IF not exists idx_users_total_views on public.users using btree (total_views desc) TABLESPACE pg_default;