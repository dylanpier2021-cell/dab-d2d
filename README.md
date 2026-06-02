# DAB Pressure Washing — Sales Hub

Internal mobile-first CRM for the door-to-door team. Reps quote jobs, log closes,
and get paid on commission; leaders run their teams; owners see the money and
export weekly payouts.

This is **Phase 1: the foundation + money loop**. It runs in **demo mode out of
the box** (sample roster + deals, no backend), and flips to a real backend the
moment you add Supabase keys.

---

## Run it right now (demo mode)

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). You'll boot in **already
signed in as Dylan (owner)**. From the Profile tab you can jump into any role
(team leader, rep) to see exactly what they see.

What works today:

- **Role-based dashboards** — rep, team leader, and owner/manager each see a
  different home screen and a different amount of money.
- **Log a job** — quote calculator seeded with the real DAB pricing, live
  commission preview, submit → posts to #wins + updates the leaderboard.
- **Commission engine** — rep 10%, team leader 12% + 2% override, rates frozen
  per deal at submit time. Math is unit-tested against the brief's examples.
- **Leaderboard** — by revenue / closes / commission, day / week / month.
- **Territory** — tap-a-house door-knock grid with shared, color-coded status.
- **Team chat** — #wins (auto-posts closes), #general, #losses-learnings.
- **Admin** — add people, set role + team + reporting line + rates, build teams,
  and a weekly payout report with **CSV export**.

Demo data lives in your browser (localStorage). "Reset demo data" is on the
Profile tab.

---

## Go live (add the real backend)

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New project (free tier is fine).

### 2. Build the database
In Supabase: **SQL Editor → New query** → paste all of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates every table,
the row-level security that enforces the permissions matrix, and seeds the
pricing table.

### 3. Create your owner login
- **Authentication → Users → Add user** → your email + a password.
- Copy that user's UUID, then in the SQL editor:
  ```sql
  insert into users (id, name, email, role, commission_rate)
  values ('<paste-uuid>', 'Dylan', 'dylan@dab.com', 'owner', 0);
  ```
- Now build the rest of your roster from the in-app **Admin** panel.

### 4. Add your keys
Copy `.env.example` to `.env` and fill in (Supabase → Settings → API):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev`. The demo banner disappears and you're on the real backend
with real logins.

### Later phases (already stubbed)
- `VITE_GOOGLE_MAPS_KEY` — turns the door-knock grid into a real address map.
- `VITE_GHL_WEBHOOK_URL` — every submitted deal POSTs to your GoHighLevel inbound
  webhook for scheduling.

---

## Deploy

Any static host works. Easiest is Vercel or Netlify:

1. Push this repo to GitHub (see below).
2. Import it in Vercel/Netlify.
3. Add the same env vars in the host's project settings.
4. Build command `npm run build`, output dir `dist`.

## Push to GitHub

```bash
git init
git add .
git commit -m "Phase 1: foundation + money loop"
git branch -M main
git remote add origin https://github.com/dylanpier2021-cell/dab-d2d.git
git push -u origin main
```

---

## Roles & permissions (enforced in the database)

| Capability | Rep | Team Leader | Manager | Owner |
|---|---|---|---|---|
| Submit own deals | ✅ | ✅ | ✅ | ✅ |
| See own money | ✅ | ✅ | ✅ | ✅ |
| See team money | ❌ | ✅ own team | ✅ all | ✅ |
| See company totals | ❌ | ❌ | ✅ | ✅ |
| Assign streets | ❌ | ✅ own team | ✅ | ✅ |
| Manage users / rates | ❌ | ❌ | ✅ | ✅ |
| Edit pricing | ❌ | ❌ | ✅ | ✅ |
| Export payouts | ❌ | ❌ | ✅ | ✅ |

## Tech
React + Vite (mobile-first), Supabase (Postgres + Auth + RLS), no CSS framework
(brand colors in `src/index.css`). Commission logic in `src/lib/commission.js`.

## Project map
```
supabase/schema.sql      database + RLS + seed pricing
src/lib/commission.js    the money math (unit-tested)
src/lib/api.js           one data API, swaps Supabase <-> demo automatically
src/lib/mockData.js      demo roster + seed deals
src/context/AuthContext  login + auto demo sign-in
src/pages/               Login, Dashboard, LogJob, Leaderboard, Territory, Chat, Profile
src/pages/admin/         user management + weekly payout report (CSV)
```

## What's next (build order)
Phase 2 hardening (deal approval flow) · Phase 3 GHL calendar embed + webhook ·
Phase 4 real Google Maps territory · Phase 5 realtime chat/knocks ·
Phase 6 scheduled weekly payout emails.
