-- ============================================================
-- Picasso Instagram — Supabase Schema
-- Run this once in your Supabase project:
--   Dashboard → SQL Editor → paste & run
-- ============================================================

-- Creations
create table if not exists creation_v1 (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  created_at  timestamptz default now(),
  prompt      text,
  title       text,
  tags        text,
  svg         text,
  text_index  text
);

-- Likes
create table if not exists like_v1 (
  id           uuid primary key default gen_random_uuid(),
  username     text not null,
  created_at   timestamptz default now(),
  creation_id  uuid references creation_v1(id) on delete cascade
);

-- ---- Row Level Security (public demo: anyone can read/write) ----
alter table creation_v1 enable row level security;
alter table like_v1      enable row level security;

create policy "public select" on creation_v1 for select using (true);
create policy "public insert" on creation_v1 for insert with check (true);

create policy "public select" on like_v1 for select using (true);
create policy "public insert" on like_v1 for insert with check (true);
create policy "public delete" on like_v1 for delete using (true);

-- ---- Enable Realtime ----
alter publication supabase_realtime add table creation_v1;
alter publication supabase_realtime add table like_v1;
