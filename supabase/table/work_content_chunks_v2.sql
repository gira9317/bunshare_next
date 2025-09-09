-- 長文コンテンツチャンク管理テーブル
create table if not exists public.work_content_chunks_v2 (
  id uuid not null default gen_random_uuid (),
  work_id uuid not null,
  chunk_index integer not null,
  chunk_text text not null,
  chunk_embedding public.vector(1536) null,
  token_count integer not null,
  chunk_hash text not null, -- 差分チェック用
  
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  
  constraint work_content_chunks_v2_pkey primary key (id),
  constraint work_content_chunks_v2_work_chunk_key unique (work_id, chunk_index),
  constraint work_content_chunks_v2_work_id_fkey foreign key (work_id) references works (work_id) on delete cascade,
  constraint work_content_chunks_v2_token_count_check check (token_count > 0 and token_count <= 8191),
  constraint work_content_chunks_v2_chunk_index_check check (chunk_index >= 0)
) tablespace pg_default;

-- インデックス
create index if not exists idx_work_content_chunks_v2_work_id 
on public.work_content_chunks_v2 using btree (work_id) tablespace pg_default;

create index if not exists idx_work_content_chunks_v2_work_id_index 
on public.work_content_chunks_v2 using btree (work_id, chunk_index) tablespace pg_default;

-- ベクトル検索インデックス
create index if not exists idx_work_content_chunks_v2_embedding_cosine 
on public.work_content_chunks_v2 using ivfflat (chunk_embedding vector_cosine_ops)
with (lists = 100) tablespace pg_default;

-- updated_atトリガー
create trigger trigger_work_content_chunks_v2_updated_at 
before update on work_content_chunks_v2 
for each row 
execute function set_updated_at();