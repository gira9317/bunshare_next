-- 埋め込み処理ログテーブル
create table if not exists public.embedding_processing_logs_v2 (
  id uuid not null default gen_random_uuid (),
  work_id uuid not null,
  batch_id uuid null, -- バッチ処理のグループ化用
  
  processing_type text not null, -- 'title', 'description', 'tags', 'content_chunk'
  chunk_index integer null, -- content_chunkの場合のみ設定
  
  status text not null, -- 'started', 'completed', 'failed', 'skipped'
  error_message text null,
  error_code text null,
  
  -- パフォーマンス・コスト追跡
  processing_time_ms integer null,
  tokens_used integer null,
  api_cost_usd numeric(10,6) null,
  
  created_at timestamp with time zone null default now(),
  
  constraint embedding_processing_logs_v2_pkey primary key (id),
  constraint embedding_processing_logs_v2_work_id_fkey foreign key (work_id) references works (work_id) on delete cascade,
  constraint embedding_processing_logs_v2_type_check check (processing_type in ('title', 'description', 'tags', 'content_chunk')),
  constraint embedding_processing_logs_v2_status_check check (status in ('started', 'completed', 'failed', 'skipped')),
  constraint embedding_processing_logs_v2_chunk_consistency check (
    (processing_type = 'content_chunk' and chunk_index is not null) or 
    (processing_type != 'content_chunk' and chunk_index is null)
  )
) tablespace pg_default;

-- インデックス
create index if not exists idx_embedding_processing_logs_v2_work_id 
on public.embedding_processing_logs_v2 using btree (work_id) tablespace pg_default;

create index if not exists idx_embedding_processing_logs_v2_batch_id 
on public.embedding_processing_logs_v2 using btree (batch_id) tablespace pg_default;

create index if not exists idx_embedding_processing_logs_v2_created_at 
on public.embedding_processing_logs_v2 using btree (created_at) tablespace pg_default;

create index if not exists idx_embedding_processing_logs_v2_status 
on public.embedding_processing_logs_v2 using btree (status) tablespace pg_default;

create index if not exists idx_embedding_processing_logs_v2_processing_type 
on public.embedding_processing_logs_v2 using btree (processing_type) tablespace pg_default;