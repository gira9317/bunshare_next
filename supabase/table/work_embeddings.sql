create table public.work_embeddings (
  id uuid not null default gen_random_uuid (),
  work_id uuid not null,
  title_embedding public.vector null,
  content_embedding public.vector null,
  description_embedding public.vector null,
  combined_embedding public.vector null,
  embedding_model text null default 'text-embedding-ada-002'::text,
  embedding_version integer null default 1,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint work_embeddings_pkey primary key (id),
  constraint work_embeddings_work_id_key unique (work_id),
  constraint work_embeddings_work_id_fkey foreign KEY (work_id) references works (work_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_work_embeddings_work_id on public.work_embeddings using btree (work_id) TABLESPACE pg_default;

create index IF not exists idx_work_embeddings_title_cosine on public.work_embeddings using ivfflat (title_embedding vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default;

create index IF not exists idx_work_embeddings_content_cosine on public.work_embeddings using ivfflat (content_embedding vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default;

create index IF not exists idx_work_embeddings_combined_cosine on public.work_embeddings using ivfflat (combined_embedding vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default;

create trigger trigger_work_embeddings_updated_at BEFORE
update on work_embeddings for EACH row
execute FUNCTION set_updated_at ();