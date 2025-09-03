create table public.work_analysis (
  id uuid not null default gen_random_uuid (),
  work_id uuid not null,
  analyzed_at timestamp with time zone null default now(),
  openai_response jsonb null,
  quality_score numeric(3, 2) null default 0.00,
  readability_score numeric(3, 2) null default 0.00,
  originality_score numeric(3, 2) null default 0.00,
  structure_score numeric(3, 2) null default 0.00,
  genre_accuracy_score numeric(3, 2) null default 0.00,
  overall_ai_score numeric(3, 2) null default 0.00,
  ai_genre_classification text null,
  ai_genre_confidence numeric(3, 2) null default 0.00,
  content_length integer null default 0,
  analysis_model text null default 'gpt-4'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint work_analysis_pkey primary key (id),
  constraint work_analysis_work_id_key unique (work_id),
  constraint work_analysis_work_id_fkey foreign KEY (work_id) references works (work_id) on delete CASCADE,
  constraint work_analysis_overall_ai_score_check check (
    (
      (overall_ai_score >= (0)::numeric)
      and (overall_ai_score <= (10)::numeric)
    )
  ),
  constraint work_analysis_ai_genre_confidence_check check (
    (
      (ai_genre_confidence >= (0)::numeric)
      and (ai_genre_confidence <= (1)::numeric)
    )
  ),
  constraint work_analysis_readability_score_check check (
    (
      (readability_score >= (0)::numeric)
      and (readability_score <= (10)::numeric)
    )
  ),
  constraint work_analysis_structure_score_check check (
    (
      (structure_score >= (0)::numeric)
      and (structure_score <= (10)::numeric)
    )
  ),
  constraint work_analysis_quality_score_check check (
    (
      (quality_score >= (0)::numeric)
      and (quality_score <= (10)::numeric)
    )
  ),
  constraint work_analysis_genre_accuracy_score_check check (
    (
      (genre_accuracy_score >= (0)::numeric)
      and (genre_accuracy_score <= (10)::numeric)
    )
  ),
  constraint work_analysis_originality_score_check check (
    (
      (originality_score >= (0)::numeric)
      and (originality_score <= (10)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_work_analysis_work_id on public.work_analysis using btree (work_id) TABLESPACE pg_default;

create index IF not exists idx_work_analysis_overall_score on public.work_analysis using btree (overall_ai_score) TABLESPACE pg_default;

create index IF not exists idx_work_analysis_analyzed_at on public.work_analysis using btree (analyzed_at) TABLESPACE pg_default;

create index IF not exists idx_work_analysis_genre on public.work_analysis using btree (ai_genre_classification) TABLESPACE pg_default;

create trigger trigger_work_analysis_stats_update
after INSERT
or
update on work_analysis for EACH row
execute FUNCTION trigger_update_work_stats ();

create trigger trigger_work_analysis_updated_at BEFORE
update on work_analysis for EACH row
execute FUNCTION set_updated_at ();