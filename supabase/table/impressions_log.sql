create table public.impressions_log (
  id uuid not null default gen_random_uuid(),
  user_id uuid null, -- ゲストユーザーも追跡するためnull許可
  work_id uuid not null,
  impression_type text not null, -- 'recommendation', 'search', 'category', 'trending', 'popular', 'new'
  page_context text null, -- 'home', 'search', 'user_profile', 'work_detail', 'category', 'series'
  position integer null, -- 表示位置（推薦リストでの順位等）
  session_id text null, -- セッション追跡用
  user_agent text null, -- デバイス/ブラウザ情報
  viewport_width integer null, -- ビューポート幅
  viewport_height integer null, -- ビューポート高さ
  intersection_ratio numeric(3,2) null, -- 表示された割合 0.00-1.00
  display_duration integer null default 1000, -- 表示時間（ミリ秒）
  impressed_at timestamp with time zone not null default now(),
  constraint impressions_log_pkey primary key (id),
  constraint impressions_log_work_id_fkey foreign key (work_id) references works (work_id) on delete cascade,
  constraint impressions_log_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint impressions_log_intersection_ratio_check check (
    (intersection_ratio >= 0.00 and intersection_ratio <= 1.00)
  )
) tablespace pg_default;

-- CTR計算用（work_id + 時間範囲）
create index idx_impressions_work_time on public.impressions_log using btree (work_id, impressed_at) tablespace pg_default;

-- ユーザー別分析用
create index idx_impressions_user_time on public.impressions_log using btree (user_id, impressed_at) where user_id is not null tablespace pg_default;

-- 推薦効果測定用
create index idx_impressions_type_context on public.impressions_log using btree (impression_type, page_context) tablespace pg_default;

-- セッション分析用
create index idx_impressions_session on public.impressions_log using btree (session_id, impressed_at) tablespace pg_default;

-- セッション内重複チェック用
create unique index idx_impressions_session_work_unique on public.impressions_log using btree (session_id, work_id) where session_id is not null tablespace pg_default;

-- CTR計算用ビュー
create or replace view work_ctr_stats as
with impression_stats as (
  select 
    work_id,
    count(*) as impression_count,
    avg(intersection_ratio) as avg_intersection_ratio,
    avg(display_duration) as avg_display_duration
  from impressions_log 
  where impressed_at >= now() - interval '30 days'
    and intersection_ratio >= 0.5 -- 50%以上表示のみカウント
    and display_duration >= 1000 -- 1秒以上表示のみカウント
  group by work_id
),
click_stats as (
  select 
    work_id,
    count(distinct user_id) as unique_clicks,
    count(*) as total_clicks
  from views_log 
  where viewed_at >= now() - interval '30 days'
  group by work_id
)
select 
  i.work_id,
  i.impression_count,
  coalesce(c.unique_clicks, 0) as unique_clicks,
  coalesce(c.total_clicks, 0) as total_clicks,
  case 
    when i.impression_count > 0 then coalesce(c.unique_clicks, 0)::float / i.impression_count
    else 0.0
  end as ctr_unique,
  case 
    when i.impression_count > 0 then coalesce(c.total_clicks, 0)::float / i.impression_count  
    else 0.0
  end as ctr_total,
  i.avg_intersection_ratio,
  i.avg_display_duration
from impression_stats i
left join click_stats c on i.work_id = c.work_id;