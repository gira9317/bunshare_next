-- シェア行動記録テーブル
create table if not exists public.shares (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  work_id uuid not null,
  share_type text not null,
  shared_at timestamp with time zone null default now(),
  shared_url text null,
  share_text text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  
  constraint shares_pkey primary key (id),
  constraint shares_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint shares_work_id_fkey foreign key (work_id) references works (work_id) on delete cascade,
  constraint shares_share_type_check check (share_type in ('twitter', 'facebook', 'line', 'copy_link', 'native'))
) tablespace pg_default;

-- インデックス
create index if not exists idx_shares_user_id 
on public.shares using btree (user_id) tablespace pg_default;

create index if not exists idx_shares_work_id 
on public.shares using btree (work_id) tablespace pg_default;

create index if not exists idx_shares_shared_at 
on public.shares using btree (shared_at desc) tablespace pg_default;

create index if not exists idx_shares_type 
on public.shares using btree (share_type) tablespace pg_default;

create index if not exists idx_shares_user_work 
on public.shares using btree (user_id, work_id) tablespace pg_default;

-- create index if not exists idx_shares_user_date 
-- on public.shares using btree (user_id, (shared_at::date)) tablespace pg_default;

-- updated_atトリガー
create trigger trigger_shares_updated_at 
before update on shares 
for each row 
execute function set_updated_at();