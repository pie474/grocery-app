# Family Grocery List

A shared grocery list for one household, built to be used on a phone in the
shop. Everyone sees the same list, updated live; each item remembers where
it's sold, which brand to get and how to pick a good one.

React + Vite on the front, Supabase (Postgres, realtime, storage) behind it.
It installs to the home screen as a PWA.

## What it does

**List** — what's needed now.

- Add items by name. Search tolerates spelling ("jira" finds Jeera) and asks
  "did you mean" before creating a near-duplicate.
- Filter to the store you're standing in. Each store pill shows how many
  things on the list it sells, and the filter stays pinned as you scroll.
- Items are grouped by category, in the order you walk the store.
- Tap the circle to check an item off, with Undo. Tap the row for details:
  the item's photos, preferred brand, how to pick it, where else it's sold
  and when it was last bought.
- Quantity, a note and who added it, per entry.

**Bought** — purchase history, by day.

- Search it; older purchases load 30 days at a time.
- **Buy again** puts an item back on the list and keeps the record.
- **Move back to list** undoes a purchase that didn't happen and removes
  the record. **Delete** removes the record only.
- Select several purchases to act on them together.

**Catalog** — every item the household has ever added.

- Search, and filter by category or store.
- Add an item to the list with one tap, or open it to edit its name,
  category, stores, photos, brands (each with a photo) and picking tips.
- **Manage categories**: add, rename, merge, delete, and drag into aisle
  order.

**Also**

- **Edit stores** (end of the store filter row): add, rename, delete.
- The avatar in the top right sets who's using this phone, which is
  recorded as who added and who bought each item.
- Changes from other phones appear within a second or two. If the
  connection drops, the list stays on screen with a notice.
- Light and dark themes follow the phone's setting.

## Setup

1. **Create a Supabase project** at supabase.com. The free tier is enough.
2. **Run the schema.** In the Supabase SQL editor, run all of `schema.sql`.
   It creates the tables, the access policies and the public `item-photos`
   storage bucket.
3. **Create your household.** In the table editor, add one row to
   `households` (any name) and copy its `id`.
4. **Add the people.** Add a row per person to `members` (name and the
   household id). This is the one thing that can't be done from the app
   yet. Skip it and the app works without names.
5. **Set the environment.**
   ```
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from
   Settings → API in the Supabase dashboard, and `VITE_HOUSEHOLD_ID` from
   step 3.
6. **Run it.**
   ```
   npm install
   npm run dev
   ```
   Stores, categories and items are all added from inside the app.

## Deploying

`npm run build` writes a static site to `dist/`. Host it anywhere that
serves static files (Vercel and Netlify both have free tiers), with the
three environment variables set at build time. Send the family the link.

To install it like an app: on Android, Chrome offers "Install app"; on
iPhone, open the link in Safari and choose Share → Add to Home Screen.
Installed copies pick up new deploys by themselves, usually on the next
launch. To change the icon, replace `public/icon.svg` and the PNGs beside
it.

## Access and privacy

There are no logins. Everyone who has the link uses the same household id,
and the database policies are open: anyone with the project's publishable
key could read or change the data. That's a reasonable trade for a private
family app whose link you don't share. To lock it down, add Supabase Auth
and scope each policy in `schema.sql` to the signed-in member.

Photos are stored in a public bucket, so anyone with a photo's URL can
view it. Removing a photo in the app unlinks it but leaves the file in
storage.

## Code layout

```
schema.sql          fresh-database schema, policies, storage bucket
migrations/         upgrades for databases created from older versions
src/App.jsx         data loading, realtime, and the list/bought actions
src/components/     one file per screen, dialog or control
src/hooks/          the "discard changes?" guard shared by the dialogs
src/utils/          search, time formatting, item and photo helpers
src/styles/         plain CSS; tokens.css holds colours, type and spacing
```

There is no test suite or linter configured. `npm run build` is the check
that everything compiles.

## Not built yet

- Managing household members from inside the app.
- Reordering an item's photos.
- Working offline: the app needs a connection to load and to save.
- Per-person sign-in (see Access and privacy).
