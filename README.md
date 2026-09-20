# Family Grocery List — starter

A shared, realtime grocery list with per-store item availability, preferred
brands (with images), and produce selection tips. Built with React + Vite +
Supabase.

## Setup

1. **Create a Supabase project** at supabase.com (free tier is plenty).
2. **Run the schema:** open the SQL editor in your Supabase dashboard and
   run everything in `schema.sql`.
3. **Create your household row** — in the Supabase table editor, add one
   row to `households` (any name), then copy its `id`.
4. **Add your stores** — add a few rows to `stores` (e.g. "Trader Joe's",
   "Costco") using that household id.
5. **Copy env vars:**
   ```
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from
   Settings → API in your Supabase dashboard, and `VITE_HOUSEHOLD_ID` from
   step 3.
6. **Install and run:**
   ```
   npm install
   npm run dev
   ```
7. **Share it with family:** deploy the `dist/` build (e.g. to Vercel or
   Netlify, free tier) and send everyone the link — they'll all read/write
   the same household id, so no login screen is needed.

## What's here vs. what's next

Included: shared realtime list, store filter ("what can I get here"),
add-item flow that can define a brand-new catalog item with stores +
preferred brand + image + selection criteria in one form, an expandable
detail view per item, and a full **Catalog** tab to browse, search,
create, edit, and delete every item in the database — including its
stores, brand list, and selection criteria.

Reasonable next steps, not built yet:
- Swiping to delete a list entry, or an "undo" after marking something got
- Auto-detecting which store you're at via geolocation instead of tapping
  a pill
- Real per-member auth if you want to lock the household down beyond a
  shared id (see the note in `schema.sql`)
