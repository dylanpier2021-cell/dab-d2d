// ============================================================================
// Commission engine — the single source of truth for the money math.
// Mirror of the rules in section 4 of the build brief.
//
//   Rep         -> 10% of their own closed jobs
//   Sub-manager -> 12% of their own jobs, + 2% override on every rep's job
//   Owner/Manager -> payouts set manually (0 default)
//
// Rates are SNAPSHOTTED onto each deal at submit time so that editing a
// rate later never rewrites historical commission.
// ============================================================================

export const DEFAULT_RATES = {
  rep: { commission_rate: 0.10, override_rate: 0.0 },
  sub_manager: { commission_rate: 0.12, override_rate: 0.02 },
  manager: { commission_rate: 0.0, override_rate: 0.0 },
  owner: { commission_rate: 0.0, override_rate: 0.0 },
}

// Round to cents — never let float noise reach payouts.
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100

export const fmt = (n) =>
  '$' + money(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmt0 = (n) =>
  '$' + Math.round(Number(n) || 0).toLocaleString('en-US')

// Compute the commission split for one deal at submit time.
// closer  = the user submitting (their commission_rate applies to total_price)
// leader  = the sub-manager who owns the closer's team (gets override), or null
export function computeCommission({ totalPrice, closer, leader }) {
  const price = money(totalPrice)
  const repRate = closer?.commission_rate ?? DEFAULT_RATES.rep.commission_rate

  // If the closer IS the team's sub-manager, they earn their 12% and there is
  // no separate override on their own job.
  const closerIsLeader = leader && closer && leader.id === closer.id
  const overrideRate = closerIsLeader ? 0 : (leader?.override_rate ?? 0)

  return {
    rep_rate_snapshot: repRate,
    override_rate_snapshot: overrideRate,
    rep_commission: money(price * repRate),
    override_commission: money(price * overrideRate),
    override_user_id: closerIsLeader ? null : (leader?.id ?? null),
  }
}

// Roll a list of deals up into a per-person weekly payout summary.
// Returns a map keyed by user id: { revenue, commission, override, total }
export function rollupByUser(deals) {
  const map = {}
  const touch = (id) => (map[id] ??= { revenue: 0, commission: 0, override: 0, total: 0 })
  for (const d of deals) {
    const r = touch(d.rep_id)
    r.revenue = money(r.revenue + d.total_price)
    r.commission = money(r.commission + d.rep_commission)
    r.total = money(r.total + d.rep_commission)
    if (d.override_user_id && d.override_commission) {
      const o = touch(d.override_user_id)
      o.override = money(o.override + d.override_commission)
      o.total = money(o.total + d.override_commission)
    }
  }
  return map
}

// Monday-start week boundaries for a given date (default: now).
// Returns { start: Date, end: Date } where start is Monday 00:00.
export function weekBounds(date = new Date()) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(d.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end }
}

export function inThisWeek(dateStr, ref = new Date()) {
  const { start, end } = weekBounds(ref)
  const t = new Date(dateStr).getTime()
  return t >= start.getTime() && t < end.getTime()
}
