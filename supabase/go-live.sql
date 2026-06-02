-- ============================================================================
-- GO-LIVE bootstrap — run this AFTER you've:
--   1. run schema.sql (creates tables + security + pricing)
--   2. created your login under Authentication -> Users -> Add user
--
-- This finds that auth user by email and makes them the OWNER, so you can log
-- in and build the rest of the roster from the in-app Admin panel.
--
-- Change the email below to the exact email you used in step 2.
-- ============================================================================

insert into users (id, name, email, role, commission_rate, override_rate)
select id, 'Dylan', email, 'owner', 0, 0
from auth.users
where email = 'dylanpier2021@gmail.com'
on conflict (id) do update set role = 'owner';

-- Optional: add your co-owners + manager the same way once they each have a
-- login created under Authentication -> Users. Example:
-- insert into users (id, name, email, role) select id,'Artem',email,'owner'   from auth.users where email='artem@...'   on conflict (id) do update set role='owner';
-- insert into users (id, name, email, role) select id,'Barak',email,'manager' from auth.users where email='barak@...'   on conflict (id) do update set role='manager';
