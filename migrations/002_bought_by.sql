-- Run this once in the Supabase SQL editor if you set up before purchases
-- recorded who bought them. Run it before deploying the matching app
-- version: that version writes bought_by when something is marked bought,
-- and those saves fail until the column exists. Older purchases keep a
-- blank buyer.

alter table list_entries
  add column bought_by uuid references members(id);
