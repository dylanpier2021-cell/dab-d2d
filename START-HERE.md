# DAB Sales Hub — Final Handoff

Your internal door-to-door sales app is built and connected to Supabase. This is
everything in one place: what's done, the 3 steps to go live, and what's next.

## What's built
- **Logins & roles** — Owner, Manager, Team Leader (Sub-Manager), Rep. Each sees a
  different amount of money/data, enforced in the database.
- **Money loop** — quote calculator (your real pricing), log a job, live commission,
  posts to #wins, updates the leaderboard. Rep 10% · Team Leader 12% + 2% override,
  frozen per deal so past payouts never change. Math is unit-tested.
- **Org** — Owners: Dylan, Artem, Barak. Manager: Barak. Three teams: Barak's,
  Hudson's, Andrew's. Barak is owner + runs his own team (earns override too).
- **Live door-knock map** — tap a house, color syncs to the whole team, name stamped.
- **Street assignment** — Map → "Assign" tab. Managers assign streets to teams;
  team leaders hand streets to their reps.
- **Shift board** — Schedule → "Crew shifts". Managers post "2–5 today", everyone
  taps Going / Can't make it, live counts.
- **Job calendar** — Schedule → "Job calendar". Your live GoHighLevel booking
  calendar embedded, so reps see booked vs. open times.
- **Team chat** — #wins (auto-posts closes), #general, #losses-learnings. Live.
- **Admin** — add people, set roles/teams/rates, weekly payout report + CSV export.
- **Rep contract** — DAB-Rep-Agreement.pdf (print & sign).

## 3 steps to finish

### 1. Run the last SQL
Supabase → SQL Editor → paste all of `supabase/setup-remaining.sql` → Run.
(Turns on live chat/map sync, creates the shift tables, sets up Barak's team.)

### 2. Put the code on GitHub + deploy
Paste this into your VS Code Claude (it has your terminal + GitHub login):

> Find the folder on this machine containing a package.json named "dab-d2d" with a
> src/ folder (look under C:\Users\PC\Claude\Clients\DAB D2D\). cd into it. Run
> `npm install` then `npm run build` and confirm it builds. Then:
> git init; git add -A; git commit -m "DAB sales hub"; git branch -M main;
> git remote remove origin 2>$null; git remote add origin https://github.com/dylanpier2021-cell/dab-d2d.git;
> git push -u origin main --force
> If GitHub asks me to sign in, walk me through it. Then tell me to redeploy on Vercel.

Then on Vercel: Add New → Project → import **dab-d2d** → Deploy. You get a live link.

### 3. Add teammate logins
For each teammate: Supabase → Authentication → Users → Add user (email + password,
Auto Confirm ON). Their role is already set in SQL, or add them in the app's Admin tab.

## Still open (next round)
- **Andrew's email** — send it; the SQL to add him is commented at the bottom of
  setup-remaining.sql.
- **Sales script** — paste the script text and it becomes a Training tab.
- **Text-to-Barak on every close** — give me your GHL *inbound webhook* URL and add an
  SMS step in that GHL workflow to (217) 689-2050.
- **Hudson blocking labor time** — handled in your GHL calendar once he's added as a
  calendar team member with his own availability.

## Project map
```
supabase/schema.sql            tables + security + pricing (already run)
supabase/setup-remaining.sql   the last SQL to run (step 1)
src/lib/commission.js          the money math (unit-tested)
src/pages/                     Dashboard, LogJob, Leaderboard, Territory, Schedule, Chat, Profile
src/pages/admin/               user management + weekly payout CSV
.env                           your Supabase keys + GHL calendar (already set)
```
