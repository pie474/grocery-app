-- Run this in the Supabase SQL editor.
-- Model: one household, many members, an item catalog shared across the
-- household, and a running list of what's currently needed.

create extension if not exists "pgcrypto";

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null,
  chain text
);

create table items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null,
  category text default 'uncategorized',
  unit text,
  selection_criteria text -- e.g. "firm, deep green, slight give at the stem"
);

-- many-to-many: which stores carry this item
create table item_stores (
  item_id uuid references items(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  primary key (item_id, store_id)
);

create table item_brands (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  brand_name text not null,
  image_url text,
  is_preferred boolean default false
);

-- the live, editable list: one row per thing currently needed or recently bought
create table list_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  quantity text,
  note text,
  status text default 'needed', -- 'needed' | 'got'
  added_by uuid references members(id),
  created_at timestamptz default now()
);

-- Turn on realtime so every household member's client gets pushed changes
alter publication supabase_realtime add table list_entries;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table item_brands;

-- Row Level Security: this starter uses one shared household id (from
-- .env) as the access boundary rather than per-user auth, since a family
-- list usually doesn't need individual logins. Anyone with the anon key
-- and household id can read/write that household's rows.
alter table households enable row level security;
alter table members enable row level security;
alter table stores enable row level security;
alter table items enable row level security;
alter table item_stores enable row level security;
alter table item_brands enable row level security;
alter table list_entries enable row level security;

create policy "household read" on items for select using (true);
create policy "household write" on items for insert with check (true);
create policy "household update" on items for update using (true);

create policy "household read" on list_entries for select using (true);
create policy "household write" on list_entries for insert with check (true);
create policy "household update" on list_entries for update using (true);

create policy "household read" on stores for select using (true);
create policy "household write" on stores for insert with check (true);

create policy "household read" on item_stores for select using (true);
create policy "household write" on item_stores for insert with check (true);

create policy "household read" on item_brands for select using (true);
create policy "household write" on item_brands for insert with check (true);

-- NOTE: these policies are intentionally open (true) to keep the starter
-- simple — anyone with your anon key could read/write any household's
-- data if they guessed a household_id. Fine for a private family app you
-- don't share the URL for; if you want it locked down properly, add
-- Supabase Auth and scope each policy to auth.uid() via the members table.
