-- Run this in the Supabase SQL editor (Project > SQL Editor > New query) before deploying.

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_no text not null,
  name text not null,
  phone text not null,
  gender text,
  dob date not null,
  residence text,
  role text,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),
  member_name text not null,
  amount numeric not null,
  network text,
  ref text not null,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists dues (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),
  member_name text not null,
  amount numeric not null,
  network text,
  ref text not null,
  period text,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table members enable row level security;
alter table donations enable row level security;
alter table dues enable row level security;

-- Anyone using the app can register and can see the member list / payment lists.
-- Nobody can update or delete rows through the public API — only the server-side
-- /api/verify function can, because it uses the service role key which bypasses RLS.
create policy "public read members" on members for select using (true);
create policy "public insert members" on members for insert with check (true);

create policy "public read donations" on donations for select using (true);
create policy "public insert donations" on donations for insert with check (true);

create policy "public read dues" on dues for select using (true);
create policy "public insert dues" on dues for insert with check (true);

-- Enable realtime updates so the app refreshes live across everyone's devices.
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table donations;
alter publication supabase_realtime add table dues;

-- Storage: create a bucket named "photos" and set it to Public in
-- Storage > Buckets in the Supabase dashboard, then run this:
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "public upload photos" on storage.objects
  for insert to anon with check (bucket_id = 'photos');

create policy "public read photos" on storage.objects
  for select to anon using (bucket_id = 'photos');
