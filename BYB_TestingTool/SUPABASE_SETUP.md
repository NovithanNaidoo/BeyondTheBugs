# Cloud sync setup — BYB Testing Tool

Your data lived in `localStorage`, which is tied to one browser on one machine.
This adds a hosted Postgres database (Supabase) so it follows you anywhere.

About ten minutes. The only file you edit is `index.html`, and only four lines
of it.

---

## 1. Create the Supabase project

1. Sign up at **supabase.com** — the free tier is enough.
2. **New project** — name it, set a database password, pick the region closest
   to you, wait for it to provision.

## 2. Create the table

Left sidebar → **SQL Editor** → **New query** → paste → **Run**:

```sql
create table app_state (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

-- Anyone with the site link can read and write.
-- See "Locking it down" below before putting anything private in here.
create policy "public read"   on app_state for select using (true);
create policy "public insert" on app_state for insert with check (true);
create policy "public update" on app_state for update using (true) with check (true);
```

## 3. Get your keys

**Project Settings** → **API**. Copy two values:

- **Project URL** — like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting `eyJ...`

## 4. Put them in the tool

Open `index.html`, search for `YOUR_SUPABASE`, replace both placeholders:

```js
const CLOUD = {
  url:   'https://nnwfhtdujqagraafopjb.supabase.co',
  key:   'sb_publishable_YhNaNXK1iID1_eQnV1Bo3Q_XuiuWyZz',
  table: 'app_state',
  rowId: 'btstore2'
};
```

## 5. Test it

1. Open the tool. The header should show a green **Cloud Synced** badge.
2. Add a test case.
3. Open the tool in a **different browser**, or a private window. Your case
   should be there.

If it shows **Offline — saved locally**, press F12 and read the console — the
error names the cause. Usually a typo in the URL or key, or the table wasn't
created.

## 6. Deploy

Commit and push. Netlify rebuilds, and the live site reads the same database as
your local copy.

---

## How it works

The whole store is saved as one JSON document in a single row, rather than
normalised into tables for projects, cases, runs and defects.

That's a deliberate choice. The tool always reads and writes the entire store at
once, and the dataset is small, so a document row matches how the data is
actually used — and it meant not rewriting every render function. If you later
want to query across the data ("every high-priority case in any project"),
that's the point to normalise into proper tables.

`localStorage` is kept as a mirror, so:

- The tool still works with no internet — it just won't sync.
- A database outage can't lose your work.
- Writes are debounced by 800ms, so editing a case sends one request rather than
  one per keystroke.

---

## Locking it down

The policies above let **anyone with your site link** read and edit the data.
For a portfolio tool that's usually fine — but know it rather than discover it.

**Simple — an unguessable id.** Change `rowId` to something like
`btstore2-7f3a91c4`. Someone would need the exact id to find your row. That's
obscurity, not security, but it stops casual snooping.

**Proper — Supabase Auth.** Add email sign-in, add a `user_id` column, change
the policies to `using (auth.uid() = user_id)`. About an hour, and genuinely
secure.

The anon key itself is *designed* to be public — it identifies the project, it
doesn't grant privileges. Access is controlled entirely by the row-level
security policies, which is why the policies are the thing to get right.

---

## Separate issue: your Trello token

`index.html` hardcodes a Trello API key and token near line 820:

```js
const API_KEY = 'd8efd...';
const TOKEN   = 'ATTAaae...';
```

That file is deployed publicly. Anyone who views source gets a token with
**write access to your Trello board** — read, edit, delete cards.

Fix it one of two ways:

1. **Revoke the token** at trello.com/app-key, and drop the integration if
   you're not using it.
2. **Move it server-side** — a Netlify Function holding the token in an
   environment variable, with the page calling your function instead of calling
   Trello directly.

Unrelated to the database work, but more urgent than it.
