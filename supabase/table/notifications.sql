create table public.notifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  type character varying(50) not null,
  title text not null,
  message text not null,
  related_user_id uuid null,
  related_work_id uuid null,
  action_url text null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_related_user_id_fkey foreign KEY (related_user_id) references users (id) on delete CASCADE,
  constraint notifications_related_work_id_fkey foreign KEY (related_work_id) references works (work_id) on delete CASCADE,
  constraint notifications_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists notifications_user_id_created_at_idx on public.notifications using btree (user_id, created_at desc) TABLESPACE pg_default;

create index IF not exists notifications_user_id_is_read_idx on public.notifications using btree (user_id, is_read) TABLESPACE pg_default;