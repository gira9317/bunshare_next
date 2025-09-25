create table public.follows (
  id uuid not null default gen_random_uuid (),
  follower_id uuid null,
  followed_id uuid null,
  created_at timestamp with time zone null default now(),
  status character varying(20) null default 'approved'::character varying,
  post_notification boolean null default true,
  constraint follows_pkey primary key (id),
  constraint follows_follower_id_followed_id_key unique (follower_id, followed_id),
  constraint follows_followed_id_fkey foreign KEY (followed_id) references users (id) on delete CASCADE,
  constraint follows_follower_id_fkey foreign KEY (follower_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists follows_status_idx on public.follows using btree (status) TABLESPACE pg_default;

create index IF not exists follows_follower_status_idx on public.follows using btree (follower_id, status) TABLESPACE pg_default;

create index IF not exists follows_followed_status_idx on public.follows using btree (followed_id, status) TABLESPACE pg_default;

create trigger trigger_notify_follow_added
after INSERT on follows for EACH row
execute FUNCTION notify_follow_added ();

create trigger trigger_update_follow_counts
after INSERT
or DELETE
or
update on follows for EACH row
execute FUNCTION update_follow_counts ();