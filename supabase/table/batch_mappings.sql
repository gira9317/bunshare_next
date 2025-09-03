create table public.batch_mappings (
  id uuid not null default gen_random_uuid (),
  batch_id text not null,
  custom_id text not null,
  author_id uuid not null,
  category text not null,
  created_at timestamp with time zone null default now(),
  constraint batch_mappings_pkey primary key (id),
  constraint batch_mappings_batch_id_custom_id_key unique (batch_id, custom_id),
  constraint batch_mappings_author_id_fkey foreign KEY (author_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_batch_mappings_batch_id on public.batch_mappings using btree (batch_id) TABLESPACE pg_default;

create index IF not exists idx_batch_mappings_author_id on public.batch_mappings using btree (author_id) TABLESPACE pg_default;