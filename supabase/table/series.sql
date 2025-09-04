create table public.series (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  title text not null,
  description text null,
  cover_image_url text null,
  created_at timestamp with time zone null default now(),
  constraint series_pkey primary key (id),
  constraint series_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;