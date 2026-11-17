-- Run this once in the Supabase SQL editor if you set up before items
-- could have photos of their own (ones that aren't tied to a brand).
-- Until then saving an item photo fails and the app says this migration
-- is needed; everything else keeps working. Safe to run again.

create table if not exists item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  image_url text not null,
  position integer default 0, -- display order
  created_at timestamptz default now()
);

alter table item_photos enable row level security;

drop policy if exists "household read" on item_photos;
drop policy if exists "household write" on item_photos;
drop policy if exists "household delete" on item_photos;
create policy "household read" on item_photos for select using (true);
create policy "household write" on item_photos for insert with check (true);
create policy "household delete" on item_photos for delete using (true);

-- An earlier version of this migration added a single items.image_url
-- column instead. If you ran that one, carry its photos over and drop it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'items' and column_name = 'image_url'
  ) then
    insert into item_photos (item_id, image_url)
      select id, image_url from items where image_url is not null;
    alter table items drop column image_url;
  end if;
end $$;
