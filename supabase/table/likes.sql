create table public.likes (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  work_id uuid not null,
  liked_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint likes_pkey primary key (id),
  constraint likes_user_id_work_id_key unique (user_id, work_id)
) TABLESPACE pg_default;

create trigger trigger_likes_delete
after DELETE on likes for EACH row
execute FUNCTION trigger_update_likes ();

create trigger trigger_likes_insert
after INSERT on likes for EACH row
execute FUNCTION trigger_update_likes ();

create trigger trigger_notify_like_added
after INSERT on likes for EACH row
execute FUNCTION notify_like_added ();