create table public.reviews (
  review_id uuid not null default gen_random_uuid (),
  work_id uuid not null,
  user_id uuid null,
  rating bigint null default '0'::bigint,
  comment text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint reviews_pkey primary key (review_id),
  constraint reviews_user_id_fkey foreign KEY (user_id) references users (id) on delete set null,
  constraint reviews_work_id_fkey foreign KEY (work_id) references works (work_id) on delete set null
) TABLESPACE pg_default;

create trigger trigger_notify_review_added
after INSERT on reviews for EACH row
execute FUNCTION notify_review_added ();

create trigger trigger_reviews_delete
after DELETE on reviews for EACH row
execute FUNCTION trigger_update_reviews ();

create trigger trigger_reviews_insert
after INSERT on reviews for EACH row
execute FUNCTION trigger_update_reviews ();

create trigger trigger_reviews_update
after
update on reviews for EACH row
execute FUNCTION trigger_update_reviews ();