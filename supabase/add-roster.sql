-- ============================================================================
-- Add roster — run AFTER creating each person's login in
-- Authentication -> Users -> Add user (email + password, Auto Confirm ON).
-- Safe to re-run. Requires Barak's Team to already exist (setup-remaining.sql).
-- ============================================================================

-- Andrew — Team Leader (sub-manager) + rep, runs Andrew's Team
insert into users (id, name, email, role, commission_rate, override_rate)
select id, 'Andrew', email, 'sub_manager', 0.12, 0.02 from auth.users where email='adreyno3@gmail.com'
on conflict (id) do update set role='sub_manager', name='Andrew', commission_rate=0.12, override_rate=0.02;
insert into teams (name, sub_manager_id)
select 'Andrew''s Team', id from auth.users where email='adreyno3@gmail.com'
and not exists (select 1 from teams where name='Andrew''s Team');
update users set team_id=(select id from teams where name='Andrew''s Team') where email='adreyno3@gmail.com';

-- Three reps on Barak's Team (report to Barak)
insert into users (id, name, email, role, commission_rate, team_id, reports_to_id)
select id, 'Jonathan', email, 'rep', 0.10,
       (select id from teams where name='Barak''s Team'),
       (select id from users where email='adjibademoubarak@gmail.com')
from auth.users where email='jdsav12@gmail.com'
on conflict (id) do update set role='rep', name='Jonathan',
  team_id=(select id from teams where name='Barak''s Team'),
  reports_to_id=(select id from users where email='adjibademoubarak@gmail.com');

insert into users (id, name, email, role, commission_rate, team_id, reports_to_id)
select id, 'Issac', email, 'rep', 0.10,
       (select id from teams where name='Barak''s Team'),
       (select id from users where email='adjibademoubarak@gmail.com')
from auth.users where email='iaramos771@gmail.com'
on conflict (id) do update set role='rep', name='Issac',
  team_id=(select id from teams where name='Barak''s Team'),
  reports_to_id=(select id from users where email='adjibademoubarak@gmail.com');

insert into users (id, name, email, role, commission_rate, team_id, reports_to_id)
select id, 'Raph', email, 'rep', 0.10,
       (select id from teams where name='Barak''s Team'),
       (select id from users where email='adjibademoubarak@gmail.com')
from auth.users where email='jessumutababa@gmail.com'
on conflict (id) do update set role='rep', name='Raph',
  team_id=(select id from teams where name='Barak''s Team'),
  reports_to_id=(select id from users where email='adjibademoubarak@gmail.com');

-- check it worked
select name, email, role from users order by role, name;
