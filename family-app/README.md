# Agona Abusua Adoagyiri family app

Membership registration (with mandatory photo upload), donations, dues, birthday
alerts and a birthday flyer generator — built with React + Vite, backed by
Supabase (database + photo storage), deployed on Vercel.

Data is shared live across everyone who uses the app: when one person
registers or a member's payment is verified, everyone else sees it update
automatically.

## 1. Create the database (Supabase — free)

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the project, open **SQL Editor > New query**, paste in the contents of
   `supabase-schema.sql` from this repo, and run it. This creates the
   `members`, `donations` and `dues` tables, sets up access rules, turns on
   live updates, and creates the `photos` storage bucket.
3. Open **Storage** in the sidebar and confirm a bucket called `photos`
   exists and is marked **Public** (the SQL script creates it, but double
   check).
4. Open **Project Settings > API** and note down:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this one secret — never share it or put it
     in client-side code)

## 2. Push this project to GitHub

```bash
cd family-app
git init
git add .
git commit -m "Agona Abusua Adoagyiri family app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env` is already git-ignored, so your keys won't be committed.

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com), click **Add New > Project**, and
   import the GitHub repo you just pushed.
2. Vercel will detect it as a Vite app automatically. Leave the build
   settings as-is (`npm run build`, output directory `dist`).
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `SUPABASE_URL` | your Supabase project URL (same as above) |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |
   | `ADMIN_SECRET` | a private code only your family officers know — this is what unlocks the Admin tab and lets someone verify a payment |

4. Click **Deploy**. In a minute or two you'll get a live URL like
   `https://agona-abusua-adoagyiri.vercel.app`.

Every time you push to the `main` branch on GitHub, Vercel redeploys
automatically.

## Local development

```bash
npm install
cp .env.example .env   # then fill in your real values
npm run dev
```

The Admin tab's verify/reject actions call `/api/verify`, which is a Vercel
serverless function — it won't work with `vercel dev` unless you also set
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SECRET` locally (see
`.env.example`). Plain `npm run dev` (Vite only) will run the app but the
Admin unlock will fail without those.

## How the pieces fit together

- **Registration, donations, dues** write straight to Supabase from the
  browser using the public anon key. Row-level security policies allow
  anyone to insert and read, but nobody can update or delete through that
  key — so a payment can only move from "pending" to "verified"/"rejected"
  through the server.
- **Admin verification** goes through `/api/verify`, a serverless function
  that checks `ADMIN_SECRET` on the server and only then uses the private
  service role key to update the record. Your admin code is never sent to
  the browser bundle or visible in the page source.
- **Photos** are resized to a 480×480 square in the browser, then uploaded
  to the public `photos` bucket in Supabase Storage.
- **Live updates** use Supabase Realtime — the app subscribes to changes on
  all three tables, so a new registration or a verified payment shows up for
  everyone without refreshing.

## Changing the admin code later

Update the `ADMIN_SECRET` environment variable in Vercel (**Project
Settings > Environment Variables**) and redeploy — no code changes needed.

## Security note

This is a straightforward setup for a family association, not a bank-grade
payment system. It records and verifies payment references you collect
manually (as you chose) — it doesn't move money itself. Keep your Supabase
service role key and `ADMIN_SECRET` private; anyone with either could alter
records.
