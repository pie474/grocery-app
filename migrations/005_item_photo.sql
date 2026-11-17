-- Run this once in the Supabase SQL editor if you set up before items
-- could have a photo of their own (one that isn't tied to a brand).
-- Until then saving an item photo fails and the app says this migration
-- is needed; everything else keeps working.

alter table items add column if not exists image_url text;
