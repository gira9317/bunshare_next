create table public.batch_processing_logs (
  id uuid not null default gen_random_uuid (),
  batch_id text not null,
  status text not null,
  total_requests integer null,
  succeeded_count integer null default 0,
  failed_count integer null default 0,
  images_generated integer null default 0,
  error_details jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint batch_processing_logs_pkey primary key (id),
  constraint batch_processing_logs_batch_id_key unique (batch_id)
) TABLESPACE pg_default;

create index IF not exists idx_batch_processing_logs_batch_id on public.batch_processing_logs using btree (batch_id) TABLESPACE pg_default;

create index IF not exists idx_batch_processing_logs_created_at on public.batch_processing_logs using btree (created_at desc) TABLESPACE pg_default;