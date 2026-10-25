-- Run this once in the Supabase SQL editor if you set up before categories
-- were their own table. It turns each item's free-text category into a
-- row in `categories`, folding together spellings that differ only in
-- case or surrounding spaces (the most-used spelling wins), then drops
-- the old text column. Deploy the matching app version right after:
-- older clients still write the text column and will fail once it's gone.

create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null
);

create unique index categories_household_name_key
  on categories (household_id, lower(name));

alter table items
  add column category_id uuid references categories(id) on delete set null;

insert into categories (household_id, name)
select distinct on (household_id, lower(name)) household_id, name
from (
  select household_id, trim(category) as name, count(*) as uses
  from items
  where trim(coalesce(category, '')) not in ('', 'uncategorized')
  group by household_id, trim(category)
) spellings
order by household_id, lower(name), uses desc, name;

update items
set category_id = categories.id
from categories
where categories.household_id = items.household_id
  and lower(categories.name) = lower(trim(items.category));

alter table items drop column category;

alter publication supabase_realtime add table categories;

alter table categories enable row level security;

create policy "household read" on categories for select using (true);
create policy "household write" on categories for insert with check (true);
create policy "household update" on categories for update using (true);
create policy "household delete" on categories for delete using (true);
