-- Run this once in the Supabase SQL editor to let the household put
-- categories in store-aisle order (Catalog > Manage categories > move up
-- and down). Until it has run the app keeps listing categories
-- alphabetically, and says so if someone tries to reorder them. Existing
-- categories start out unplaced (null), and unplaced categories sort
-- after placed ones, alphabetically.

alter table categories
  add column sort_order integer;
