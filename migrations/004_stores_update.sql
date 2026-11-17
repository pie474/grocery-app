-- Run this once in the Supabase SQL editor if you set up before stores
-- could be renamed (List > Edit stores > Rename). Without it row level
-- security quietly ignores the rename, and the app says this migration
-- is needed. Adding and deleting stores already work.

create policy "household update" on stores for update using (true);
