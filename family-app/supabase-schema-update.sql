-- Run this in the Supabase SQL editor AFTER supabase-schema.sql has already
-- been run once. This adds: proper admin login, a safe auto-numbering
-- sequence for member numbers (so bulk import can't collide), and makes
-- the photo optional for bulk-imported members (self-registration in the
-- app still requires a photo — that's enforced by the app, not the database).

-- 1. Allow members without a photo (bulk-imported members can add one later)
alter table members alter column photo_url drop not null;

-- 2. Auto-assign member numbers on the server, so simultaneous registrations
--    and bulk imports never collide.
create sequence if not exists member_no_seq;

-- Keep numbering continuing on from members you already have. Wrapped in a
-- do-block because setval() can't be called with 0, which would happen if
-- you're setting this up before any members have registered yet.
do $$
declare
  member_count integer;
begin
  select count(*) into member_count from members;
  if member_count > 0 then
    perform setval('member_no_seq', member_count, true);
  end if;
end $$;

create or replace function set_member_no() returns trigger as $$
begin
  if new.member_no is null or new.member_no = '' then
    new.member_no := 'AAA-' || lpad(nextval('member_no_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_member_no on members;
create trigger trg_set_member_no before insert on members
for each row execute function set_member_no();

-- 3. Admin login allowlist. Nobody can read this table through the public
--    API (no policies = row level security blocks everyone except the
--    service role used by the serverless functions) — only you running
--    SQL, or the /api functions, can check it.
create table if not exists admins (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;

-- After creating an admin user in Authentication > Users (see README),
-- run this with their real email to let them into the Admin tab:
-- insert into admins (email) values ('you@example.com');
