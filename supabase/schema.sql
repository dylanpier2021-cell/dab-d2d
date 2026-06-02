-- ============================================================================
-- DAB Pressure Washing — Sales Hub schema
-- Run this in the Supabase SQL editor (Project -> SQL -> New query -> paste -> Run).
-- It creates all tables, the permissions (row-level security), and seeds pricing.
-- ============================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Teams ----------------------------------------------------------------------
create table if not exists teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  sub_manager_id uuid,
  created_at    timestamptz default now()
);

-- Users (profile rows; auth handled by Supabase auth.users) -------------------
-- role: owner | manager | sub_manager | rep
create table if not exists users (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  email           text unique not null,
  role            text not null default 'rep' check (role in ('owner','manager','sub_manager','rep')),
  team_id         uuid references teams(id) on delete set null,
  reports_to_id   uuid references users(id) on delete set null,
  commission_rate numeric not null default 0.10,   -- closer rate on own jobs
  override_rate   numeric not null default 0.00,   -- override on team's jobs (sub-managers)
  active          boolean not null default true,
  created_at      timestamptz default now()
);

alter table teams
  add constraint teams_sub_manager_fk
  foreign key (sub_manager_id) references users(id) on delete set null
  not valid;

-- Pricing table (admin-editable) ---------------------------------------------
-- unit: flat | per_sqft | per_window
create table if not exists pricing (
  id          uuid primary key default gen_random_uuid(),
  service     text not null,        -- House Wash | Driveway | Patio | Windows
  tier        text not null,        -- label shown in calculator
  size_min    int,
  size_max    int,
  price       numeric not null,     -- flat price OR per-unit rate
  unit        text not null default 'flat' check (unit in ('flat','per_sqft','per_window')),
  sort_order  int default 0,
  active      boolean not null default true
);

-- Deals / closed jobs --------------------------------------------------------
-- status: submitted | approved
-- payment_status: paid | invoice | deposit
create table if not exists deals (
  id                  uuid primary key default gen_random_uuid(),
  rep_id              uuid not null references users(id) on delete cascade,
  team_id             uuid references teams(id) on delete set null,
  services            jsonb not null default '[]'::jsonb,  -- [{type,tier,qty,line_price}]
  customer_name       text,
  address             text,
  phone               text,
  lat                 numeric,
  lng                 numeric,
  total_price         numeric not null default 0,
  payment_status      text not null default 'paid' check (payment_status in ('paid','invoice','deposit')),
  photo_url           text,
  notes               text,
  -- commission snapshot, frozen at submit time so edits to rates don't rewrite history
  rep_rate_snapshot   numeric not null default 0.10,
  override_rate_snapshot numeric not null default 0.02,
  rep_commission      numeric not null default 0,
  override_commission numeric not null default 0,
  override_user_id    uuid references users(id) on delete set null,  -- the sub-manager who earns override
  status              text not null default 'submitted' check (status in ('submitted','approved')),
  ghl_synced          boolean not null default false,
  closed_at           timestamptz default now(),
  created_at          timestamptz default now()
);

-- Territory assignments ------------------------------------------------------
create table if not exists territories (
  id               uuid primary key default gen_random_uuid(),
  neighborhood     text not null,
  street           text,
  assigned_team_id uuid references teams(id) on delete set null,
  assigned_rep_id  uuid references users(id) on delete set null,
  work_date        date default current_date,
  created_at       timestamptz default now()
);

-- Knock logs (per-house door status) -----------------------------------------
-- status: not_knocked | no_answer | not_interested | follow_up | closed
create table if not exists knock_logs (
  id            uuid primary key default gen_random_uuid(),
  territory_id  uuid references territories(id) on delete cascade,
  address       text not null,
  lat           numeric,
  lng           numeric,
  status        text not null default 'no_answer'
                check (status in ('not_knocked','no_answer','not_interested','follow_up','closed')),
  rep_id        uuid references users(id) on delete set null,
  updated_at    timestamptz default now()
);

-- Chat -----------------------------------------------------------------------
create table if not exists chat_channels (
  id    uuid primary key default gen_random_uuid(),
  slug  text unique not null,   -- wins | general | losses-learnings
  name  text not null,
  sort_order int default 0
);

create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid references chat_channels(id) on delete cascade,
  author_id   uuid references users(id) on delete set null,
  body        text not null,
  deal_id     uuid references deals(id) on delete set null,
  created_at  timestamptz default now()
);

-- ============================================================================
-- HELPER FUNCTIONS (used by RLS so policies stay simple + avoid recursion)
-- ============================================================================
create or replace function my_role() returns text
  language sql stable security definer set search_path = public as
$$ select role from users where id = auth.uid() $$;

create or replace function my_team() returns uuid
  language sql stable security definer set search_path = public as
$$ select team_id from users where id = auth.uid() $$;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as
$$ select coalesce(my_role() in ('owner','manager'), false) $$;

-- ============================================================================
-- ROW-LEVEL SECURITY  (the permissions matrix, enforced in the database)
-- ============================================================================
alter table users        enable row level security;
alter table teams        enable row level security;
alter table deals        enable row level security;
alter table pricing      enable row level security;
alter table territories  enable row level security;
alter table knock_logs   enable row level security;
alter table chat_channels enable row level security;
alter table chat_messages enable row level security;

-- USERS ----------------------------------------------------------------------
-- Everyone can read themselves. Sub-managers read their team. Admins read all.
create policy users_select on users for select using (
  id = auth.uid()
  or is_admin()
  or (my_role() = 'sub_manager' and team_id = my_team())
);
create policy users_self_update on users for update using (id = auth.uid());
create policy users_admin_write on users for all using (is_admin()) with check (is_admin());

-- TEAMS ----------------------------------------------------------------------
create policy teams_select on teams for select using (
  is_admin() or id = my_team()
);
create policy teams_admin_write on teams for all using (is_admin()) with check (is_admin());

-- DEALS ----------------------------------------------------------------------
-- Rep: own deals. Sub-manager: own team's deals. Admin: all.
create policy deals_select on deals for select using (
  rep_id = auth.uid()
  or is_admin()
  or (my_role() = 'sub_manager' and team_id = my_team())
);
-- Anyone can insert a deal they personally closed.
create policy deals_insert on deals for insert with check (rep_id = auth.uid());
-- Reps edit their own un-approved deals; admins edit anything.
create policy deals_update on deals for update using (
  is_admin() or (rep_id = auth.uid() and status = 'submitted')
);
create policy deals_admin_delete on deals for delete using (is_admin());

-- PRICING --------------------------------------------------------------------
create policy pricing_select on pricing for select using (auth.uid() is not null);
create policy pricing_admin_write on pricing for all using (is_admin()) with check (is_admin());

-- TERRITORIES ----------------------------------------------------------------
create policy territories_select on territories for select using (
  is_admin()
  or assigned_rep_id = auth.uid()
  or assigned_team_id = my_team()
);
-- Admins assign neighborhoods; sub-managers assign streets within their team.
create policy territories_write on territories for all using (
  is_admin() or (my_role() = 'sub_manager' and assigned_team_id = my_team())
) with check (
  is_admin() or (my_role() = 'sub_manager' and assigned_team_id = my_team())
);

-- KNOCK LOGS -----------------------------------------------------------------
-- The whole team can SEE every knock (live coverage). Any signed-in rep can log.
create policy knocks_select on knock_logs for select using (auth.uid() is not null);
create policy knocks_insert on knock_logs for insert with check (auth.uid() is not null);
create policy knocks_update on knock_logs for update using (auth.uid() is not null);

-- CHAT -----------------------------------------------------------------------
create policy channels_select on chat_channels for select using (auth.uid() is not null);
create policy channels_admin_write on chat_channels for all using (is_admin()) with check (is_admin());
create policy messages_select on chat_messages for select using (auth.uid() is not null);
create policy messages_insert on chat_messages for insert with check (author_id = auth.uid());

-- ============================================================================
-- SEED: pricing table (the real DAB numbers)
-- ============================================================================
insert into pricing (service, tier, size_min, size_max, price, unit, sort_order) values
  ('House Wash','Small 1-story (1,000-1,500 sqft)',1000,1500,269,'flat',1),
  ('House Wash','Large 1-story (1,500-2,000 sqft)',1500,2000,334,'flat',2),
  ('House Wash','Small 2-story (2,000-2,800 sqft)',2000,2800,409,'flat',3),
  ('House Wash','Large 2-story (2,800-3,500+ sqft)',2800,3500,499,'flat',4),
  ('Driveway','1-car (300-500 sqft)',300,500,179,'flat',5),
  ('Driveway','2-car (500-800 sqft)',500,800,219,'flat',6),
  ('Driveway','3-car (800-1,200 sqft)',800,1200,289,'flat',7),
  ('Driveway','XL / long (1,200-2,000+ sqft)',1200,2000,0.39,'per_sqft',8),
  ('Patio','Small (100-200 sqft)',100,200,114,'flat',9),
  ('Patio','Medium (200-400 sqft)',200,400,164,'flat',10),
  ('Patio','Large (400-700 sqft)',400,700,224,'flat',11),
  ('Patio','XL (700+ sqft)',700,2000,0.35,'per_sqft',12),
  ('Windows','Small / 2-panel',null,null,5,'per_window',13),
  ('Windows','Medium / 4-panel',null,null,7,'per_window',14),
  ('Windows','Large / bay or slider',null,null,10,'per_window',15)
on conflict do nothing;

-- Seed chat channels
insert into chat_channels (slug, name, sort_order) values
  ('wins','#wins',1),
  ('general','#general',2),
  ('losses-learnings','#losses-learnings',3)
on conflict (slug) do nothing;

-- ============================================================================
-- AFTER RUNNING THIS:
-- 1. Create your owner login in Authentication -> Users -> Add user (email+pass).
-- 2. Copy that user's UUID, then insert the matching profile row, e.g.:
--    insert into users (id, name, email, role, commission_rate)
--    values ('<uuid>', 'Dylan', 'dylan@dab.com', 'owner', 0);
-- 3. Build teams + the rest of your roster from the in-app admin panel.
-- ============================================================================
