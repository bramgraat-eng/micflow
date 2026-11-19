-- MicFlow Supabase schema
-- Run this in the Supabase SQL Editor

-- Productions
create table if not exists productions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  config jsonb default '{"hs":16,"hh":8,"cb":1,"iem":0}'::jsonb,
  created_at timestamptz default now()
);

-- Blocks
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) on delete cascade,
  name text not null,
  start_time text,
  end_time text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Speakers per block
create table if not exists speakers (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Assignments (mic -> speaker per block)
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete cascade,
  mic_id text not null,
  speaker_name text,
  unique(block_id, mic_id)
);

-- Statuses
create table if not exists statuses (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete cascade,
  mic_id text not null,
  issued boolean default false,
  problem boolean default false,
  unique(block_id, mic_id)
);

-- Enable realtime
alter publication supabase_realtime add table productions, blocks, speakers, assignments, statuses;

-- RLS (for now open; tighten later with auth)
alter table productions enable row level security;
alter table blocks enable row level security;
alter table speakers enable row level security;
alter table assignments enable row level security;
alter table statuses enable row level security;

create policy "Allow all" on productions for all using (true) with check (true);
create policy "Allow all" on blocks for all using (true) with check (true);
create policy "Allow all" on speakers for all using (true) with check (true);
create policy "Allow all" on assignments for all using (true) with check (true);
create policy "Allow all" on statuses for all using (true) with check (true);
