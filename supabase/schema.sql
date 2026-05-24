-- ─────────────────────────────────────────────────────────────────────────────
-- SiteScope — Supabase schema
-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. App settings (stores GSC OAuth tokens, site preferences)
create table if not exists app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz default now()
);

-- 2. Rank history (one row per keyword per audit)
create table if not exists rank_history (
  id          uuid default gen_random_uuid() primary key,
  domain      text not null,
  keyword     text not null,
  position    numeric(6,1) not null,
  impressions integer default 0,
  clicks      integer default 0,
  ctr         numeric(5,2) default 0,
  audited_at  timestamptz default now()
);

-- Indexes for fast lookups
create index if not exists rank_history_domain_date
  on rank_history (domain, audited_at desc);

create index if not exists rank_history_domain_keyword
  on rank_history (domain, keyword, audited_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (optional — disable if running server-side with service key)
-- ─────────────────────────────────────────────────────────────────────────────
alter table app_settings  enable row level security;
alter table rank_history   enable row level security;

-- Allow full access via service key (used by Next.js server)
create policy "service key full access" on app_settings
  for all using (true) with check (true);

create policy "service key full access" on rank_history
  for all using (true) with check (true);
