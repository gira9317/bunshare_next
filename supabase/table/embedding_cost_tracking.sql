-- 埋め込み処理コスト追跡テーブル
create table if not exists public.embedding_cost_tracking (
  id uuid not null default gen_random_uuid (),
  date date not null default current_date,
  
  -- 日別集計データ
  total_tokens_used integer not null default 0,
  total_api_calls integer not null default 0,
  total_cost_usd numeric(10,6) not null default 0.00,
  
  -- モデル別追跡
  model_name text not null default 'text-embedding-3-small',
  
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  
  constraint embedding_cost_tracking_pkey primary key (id),
  constraint embedding_cost_tracking_date_model_key unique (date, model_name),
  constraint embedding_cost_tracking_tokens_check check (total_tokens_used >= 0),
  constraint embedding_cost_tracking_calls_check check (total_api_calls >= 0),
  constraint embedding_cost_tracking_cost_check check (total_cost_usd >= 0.00)
) tablespace pg_default;

-- インデックス
create index if not exists idx_embedding_cost_tracking_date 
on public.embedding_cost_tracking using btree (date) tablespace pg_default;

create index if not exists idx_embedding_cost_tracking_model 
on public.embedding_cost_tracking using btree (model_name) tablespace pg_default;

create index if not exists idx_embedding_cost_tracking_created_at 
on public.embedding_cost_tracking using btree (created_at) tablespace pg_default;

-- updated_atトリガー
create trigger trigger_embedding_cost_tracking_updated_at 
before update on embedding_cost_tracking 
for each row 
execute function set_updated_at();

-- 日別コスト集計を更新する関数
create or replace function update_daily_embedding_cost(
  p_date date default current_date,
  p_model_name text default 'text-embedding-3-small',
  p_tokens_used integer default 0,
  p_api_calls integer default 1,
  p_cost_usd numeric(10,6) default 0.00
) returns void as $$
begin
  insert into embedding_cost_tracking (date, model_name, total_tokens_used, total_api_calls, total_cost_usd)
  values (p_date, p_model_name, p_tokens_used, p_api_calls, p_cost_usd)
  on conflict (date, model_name) 
  do update set
    total_tokens_used = embedding_cost_tracking.total_tokens_used + p_tokens_used,
    total_api_calls = embedding_cost_tracking.total_api_calls + p_api_calls,
    total_cost_usd = embedding_cost_tracking.total_cost_usd + p_cost_usd,
    updated_at = now();
end;
$$ language plpgsql security definer;