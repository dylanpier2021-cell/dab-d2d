import { useState } from 'react'
import { weekBounds, rollupByUser, money, fmt, fmt0 } from '../../lib/commission.js'

// Owner/Manager weekly payout summary + CSV export.
export default function WeeklyReport({ deals, users, teams }) {
  const [weekOffset, setWeekOffset] = useState(0)  // 0 = this week, -1 = last week

  const ref = new Date()
  ref.setDate(ref.getDate() + weekOffset * 7)
  const { start, end } = weekBounds(ref)

  const inWeek = deals.filter((d) => {
    const t = new Date(d.closed_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  })

  const rollup = rollupByUser(inWeek)
  const rows = users
    .filter((u) => rollup[u.id])
    .map((u) => ({ user: u, ...rollup[u.id] }))
    .sort((a, b) => b.total - a.total)

  const revenue = money(inWeek.reduce((s, d) => s + d.total_price, 0))
  const owed = money(rows.reduce((s, r) => s + r.total, 0))
  const net = money(revenue - owed)

  const exportCsv = () => {
    const header = ['Name', 'Role', 'Team', 'Revenue closed', 'Commission', 'Override', 'Amount owed']
    const teamName = (id) => teams.find((t) => t.id === id)?.name || ''
    const lines = [header.join(',')]
    rows.forEach((r) => {
      lines.push([
        csv(r.user.name), r.user.role, csv(teamName(r.user.team_id)),
        money(r.revenue), money(r.commission), money(r.override), money(r.total),
      ].join(','))
    })
    lines.push(['', '', '', money(revenue), '', '', money(owed)].join(','))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dab-payouts-${start.toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="btn" onClick={() => setWeekOffset((w) => w - 1)}>← Prev</button>
        <div style={{ fontSize: 13, color: 'var(--dab-text-dim)' }}>
          {start.toLocaleDateString()} – {new Date(end.getTime() - 1).toLocaleDateString()}
        </div>
        <button className="btn" disabled={weekOffset >= 0} onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}>Next →</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="label">Revenue</div><div className="value">{fmt0(revenue)}</div></div>
        <div className="stat"><div className="label">Commission owed</div><div className="value accent">{fmt0(owed)}</div></div>
        <div className="stat"><div className="label">Net after comm.</div><div className="value">{fmt0(net)}</div></div>
        <div className="stat"><div className="label">Closes</div><div className="value">{inWeek.length}</div></div>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginBottom: 14 }} onClick={exportCsv} disabled={!rows.length}>
        Export payouts CSV
      </button>

      <div className="card">
        <div className="card-title">Owed this week</div>
        {rows.length === 0 && <div className="empty">No closes this week.</div>}
        {rows.map((r) => (
          <div className="row" key={r.user.id}>
            <div className="grow">
              <div className="name">{r.user.name}</div>
              <div className="meta">
                {fmt0(r.revenue)} revenue
                {r.override > 0 && ` · ${fmt(r.override)} override`}
              </div>
            </div>
            <div className="amt">{fmt(r.total)}</div>
          </div>
        ))}
      </div>
      <div className="helper" style={{ marginTop: 12 }}>
        Week runs Monday–Sunday (configurable). Commission is frozen per deal at submit time, so editing a rate later never changes past payouts.
      </div>
    </div>
  )
}

const csv = (s = '') => `"${String(s).replace(/"/g, '""')}"`
