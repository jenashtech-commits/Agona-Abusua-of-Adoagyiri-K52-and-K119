# Agona Abusua Adoagyiri family app

Membership registration (mandatory photo upload for self-registration),
donations, dues, birthday alerts, a birthday flyer generator, bulk Excel
import, Excel report export, and admin login — built with React + Vite,
backed by Supabase (database, storage, auth), deployed on Vercel.

Data is shared live across everyone who uses the app: a new registration or
a verified payment shows up for everyone automatically, no refresh needed.

## 1. Set up the database (Supabase — free)

If this is a **brand-new** Supabase project:
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor > New query** — paste in `supabase-schema.sql`, run it.
3. Then paste in `supabase-schema-update.sql`, run it too (this adds admin
   login support and safe auto-numbering for members).
4. Confirm **Storage** has a bucket called `photos`, marked **Public**.

If you already had the app running from before and are just upgrading:
1. **SQL Editor > New query** — paste in `supabase-schema-update.sql` only,
   and run it.

Then note down, from **Project Settings > API**:
- **Project URL**
- **anon public** key
- **service_role** key (secret — never expose this to the browser)

## 2. Create your admin login

Family officers sign into the Admin tab with a real email + password
(no more shared PIN). To create one:

1. In Supabase, go to **Authentication > Users > Add user**. Set an email
   and password, and tick "Auto confirm user" so they can sign in right
   away.
2. Go to **SQL Editor** and run, with the real email you just created:
   ```sql
   insert into admins (email) values ('officer@example.com');
   ```
3. Repeat for each additional family officer who needs Admin access.

Anyone can still use the **Register**, **Donate**, **Pay dues**,
**Birthdays** and **Birthday flyer** tabs without any login — only the
Admin tab (verifying payments, bulk import, exporting reports) requires
signing in.

## 3. Push this project to GitHub

```bash
cd family-app
git init
git add .
git commit -m "Agona Abusua Adoagyiri family app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env` is git-ignored, so your keys won't be committed.

## 4. Deploy on Vercel

1. [vercel.com](https://vercel.com) → **Add New > Project** → import your
   GitHub repo.
2. Leave build settings as-is (Vite: `npm run build`, output `dist`). Make
   sure **Root Directory** points at the folder containing `package.json`.
3. Add these **Environment Variables** before deploying:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `SUPABASE_URL` | your Supabase project URL (same as above) |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |

4. **Deploy.** Every future push to `main` redeploys automatically.

If you're upgrading an existing deployment: just add/update the environment
variables above (the old `ADMIN_SECRET` variable is no longer used and can
be removed), push this updated code to GitHub, and redeploy.

## What's new in this update

- **Admin login** — real email + password sign-in (Supabase Auth) instead
  of a shared PIN, checked against an `admins` allowlist table that only
  the server can read.
- **General member registration** stays fully open, no login — separate
  from the now-authenticated Admin area.
- **Bulk Excel import** — Admin tab lets you upload a spreadsheet
  (columns: Name, Phone, Gender, DOB, Residence, Role) to register many
  members at once. A "Download template" button gives you the right
  headers. Imported members start without a photo (shown as initials)
  until one is added.
- **Excel report export** — one click in the Admin tab downloads a
  workbook with Members, Donations and Dues as separate sheets.
- **Splash screen + 3D badge** — the family crest spins in as a 3D
  medallion while the app loads, then settles into a smaller spinning
  badge in the header. Realtime sync is shown with a live "●" indicator.
- Smoother transitions, skeleton loading, and general visual polish
  throughout.

## How the pieces fit together

- **Registration, donations, dues** write straight to Supabase from the
  browser using the public anon key. Row-level security policies allow
  anyone to insert and read, but nobody can update or delete through that
  key — a payment can only move to "verified"/"rejected" through the
  server.
- **Admin actions** (verifying a payment) go through `/api/verify`, which
  checks the caller's Supabase Auth session against the `admins` table
  using the private service role key — never exposed to the browser.
- **Member numbers** (`AAA-0001`, etc.) are assigned automatically by a
  database trigger, so simultaneous registrations or a bulk import can
  never collide.
- **Photos** are resized to a 480×480 square in the browser, then uploaded
  to the public `photos` bucket in Supabase Storage. Bulk-imported members
  have no photo until one is added, and show initials instead.
- **Live updates** use Supabase Realtime — the app subscribes to changes
  on all three tables, so everyone's view updates without refreshing.

## Local development

```bash
npm install
cp .env.example .env   # then fill in your real values
npm run dev
```

The Admin tab's login and verify actions call `/api/*` serverless
functions, which need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set
locally too (see `.env.example`) — plain `npm run dev` (Vite only) won't
run those functions unless you use `vercel dev` instead.

## Security note

This is a straightforward setup for a family association, not a
bank-grade payment system. It records and verifies payment references you
collect manually — it doesn't move money itself. Keep your Supabase
service role key private, and only add trusted people's emails to the
`admins` table.
