create table public.user_preferences (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  preference_vector public.vector null,
  total_works integer not null default 0,
  total_weight numeric(8, 2) not null default 0.00,
  average_weight numeric(5, 2) not null default 0.00,
  liked_works_count integer not null default 0,
  rated_works_count integer not null default 0,
  progress_works_count integer not null default 0,
  last_calculated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_preferences_pkey primary key (id),
  constraint user_preferences_user_id_key unique (user_id),
  constraint user_preferences_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint user_preferences_average_weight_check check ((average_weight >= (0)::numeric)),
  constraint user_preferences_total_weight_check check ((total_weight >= (0)::numeric)),
  constraint user_preferences_total_works_check check ((total_works >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_user_preferences_user_id on public.user_preferences using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_preferences_last_calculated on public.user_preferences using btree (last_calculated_at) TABLESPACE pg_default;

create index IF not exists idx_user_preferences_total_works on public.user_preferences using btree (total_works) TABLESPACE pg_default;

create index IF not exists idx_user_preferences_vector on public.user_preferences using ivfflat (preference_vector vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default;

create trigger trigger_user_preferences_stats_update
after INSERT
or DELETE
or
update on user_preferences for EACH row
execute FUNCTION trigger_update_user_preference_stats ();

create trigger trigger_user_preferences_updated_at BEFORE
update on user_preferences for EACH row
execute FUNCTION update_user_preferences_updated_at ();