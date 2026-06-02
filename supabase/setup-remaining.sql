-- ============================================================================
-- DAB Sales Hub — run this ONCE to finish setup. Safe to re-run.
-- (You already ran schema.sql, go-live.sql, and the teammate role SQL.)
-- ============================================================================

-- 1) Live sync for chat + map
create unique index if not exists knock_logs_address_idx on knock_logs (address);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='chat_messages') then alter publication supabase_realtime add table chat_messages; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='knock_logs') then alter publication supabase_realtime add table knock_logs; end if;
end $$;

-- 2) Shift board tables
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  label text, shift_date date not null, start_time text, end_time text,
  team_id uuid references teams(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now());
create table if not exists shift_rsvps (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references shifts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  status text, updated_at timestamptz default now(), unique (shift_id, user_id));
alter table shifts enable row level security;
alter table shift_rsvps enable row level security;
drop policy if exists shifts_sel on shifts;
drop policy if exists shifts_wr on shifts;
drop policy if exists rsvp_sel on shift_rsvps;
drop policy if exists rsvp_self on shift_rsvps;
create policy shifts_sel on shifts for select using (auth.uid() is not null);
create policy shifts_wr on shifts for all using (is_admin() or my_role()='sub_manager') with check (is_admin() or my_role()='sub_manager');
create policy rsvp_sel on shift_rsvps for select using (auth.uid() is not null);
create policy rsvp_self on shift_rsvps for all using (user_id=auth.uid()) with check (user_id=auth.uid());
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='shifts') then alter publication supabase_realtime add table shifts; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='shift_rsvps') then alter publication supabase_realtime add table shift_rsvps; end if;
end $$;

-- 3) Barak = owner who also runs his own team (12% on his closes, 2% override on his reps)
update users set role='owner', commission_rate=0.12, override_rate=0.02 where email='adjibademoubarak@gmail.com';
insert into teams (name, sub_manager_id) select 'Barak''s Team', id from auth.users where email='adjibademoubarak@gmail.com' and not exists (select 1 from teams where name='Barak''s Team');
update users set team_id=(select id from teams where name='Barak''s Team') where email='adjibademoubarak@gmail.com';

-- 4) Andrew — once he has a login (Authentication -> Add user), run:
-- insert into users (id,name,email,role,commission_rate,override_rate)
-- select id,'Andrew',email,'sub_manager',0.12,0.02 from auth.users where email='ANDREW_EMAIL_HERE'
-- on conflict (id) do update set role=excluded.role,name=excluded.name;
-- insert into teams (name,sub_manager_id) select 'Andrew''s Team',id from auth.users where email='ANDREW_EMAIL_HERE' and not exists (select 1 from teams where name='Andrew''s Team');
-- update users set team_id=(select id from teams where name='Andrew''s Team') where email='ANDREW_EMAIL_HERE';
