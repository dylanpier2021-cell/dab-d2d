-- ============================================================================
-- Run this ONCE in the Supabase SQL editor to turn on live sync for chat + the
-- door-knock map, and to drop a starter street on the map so you can test it.
-- Safe to re-run.
-- ============================================================================

-- 1. One knock per address (lets the map upsert the latest status cleanly).
create unique index if not exists knock_logs_address_idx on knock_logs (address);

-- 2. Turn on realtime broadcasting for the two live tables.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'knock_logs') then
    alter publication supabase_realtime add table knock_logs;
  end if;
end $$;

-- 3. Give Hudson's team a starter street so the map has something to show.
--    (Assigned to Hudson's team; edit the neighborhood/street to a real one.)
insert into territories (neighborhood, street, assigned_team_id, assigned_rep_id, work_date)
select 'Starter Neighborhood', 'Main St',
       (select id from teams where name = 'Hudson''s Team'),
       (select id from users where email = 'hudsonbwolfe2009@gmail.com'),
       current_date
where not exists (select 1 from territories where street = 'Main St');
