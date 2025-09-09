-- text-embedding-3-small専用テーブル
create table if not exists public.work_embeddings_v2 (
  id uuid not null default gen_random_uuid (),
  work_id uuid not null,
  
  -- 差分チェック用ハッシュ
  title_hash text null,
  content_hash text null,
  tags_hash text null,
  
  -- 埋め込みベクター（text-embedding-3-small: 1536次元）
  title_embedding public.vector(1536) null,
  description_embedding public.vector(1536) null,
  tags_embedding public.vector(1536) null,
  
  -- メタデータ
  embedding_model text null default 'text-embedding-3-small'::text,
  embedding_version integer null default 1,
  processing_status text null default 'pending'::text,
  
  -- コスト・パフォーマンス追跡
  tokens_used integer null default 0,
  api_cost_usd numeric(10,6) null default 0.00,
  processing_time_ms integer null,
  
  -- タイムスタンプ
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  last_processed_at timestamp with time zone null,
  
  constraint work_embeddings_v2_pkey primary key (id),
  constraint work_embeddings_v2_work_id_key unique (work_id),
  constraint work_embeddings_v2_work_id_fkey foreign key (work_id) references works (work_id) on delete cascade,
  constraint work_embeddings_v2_status_check check (processing_status in ('pending', 'processing', 'completed', 'failed', 'skipped'))
) tablespace pg_default;

-- 基本インデックス
create index if not exists idx_work_embeddings_v2_work_id 
on public.work_embeddings_v2 using btree (work_id) tablespace pg_default;

create index if not exists idx_work_embeddings_v2_status 
on public.work_embeddings_v2 using btree (processing_status) tablespace pg_default;

create index if not exists idx_work_embeddings_v2_updated_at 
on public.work_embeddings_v2 using btree (updated_at) tablespace pg_default;

create index if not exists idx_work_embeddings_v2_last_processed_at 
on public.work_embeddings_v2 using btree (last_processed_at) tablespace pg_default;

-- ベクトル検索用インデックス（ivfflat）
create index if not exists idx_work_embeddings_v2_title_cosine 
on public.work_embeddings_v2 using ivfflat (title_embedding vector_cosine_ops)
with (lists = 100) tablespace pg_default;

create index if not exists idx_work_embeddings_v2_description_cosine 
on public.work_embeddings_v2 using ivfflat (description_embedding vector_cosine_ops)
with (lists = 100) tablespace pg_default;

create index if not exists idx_work_embeddings_v2_tags_cosine 
on public.work_embeddings_v2 using ivfflat (tags_embedding vector_cosine_ops)
with (lists = 100) tablespace pg_default;

-- updated_atトリガー
create trigger trigger_work_embeddings_v2_updated_at 
before update on work_embeddings_v2 
for each row 
execute function set_updated_at();