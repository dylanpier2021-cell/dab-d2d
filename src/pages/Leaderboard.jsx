import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { getDeals, getUsers } from '../lib/api.js'
import { weekBounds, money, fmt0 } from '../lib/commission.js'

const initials = (n = '') => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function Leaderboard() {
  const [deals, setDeals] = useState([])
  const [users, setUsers] = useState([])
  const [range, setRange] = useState('week')
  const [metric, setMetric] = useState('revenue')

  useEffect(() => {
    getDeals().then(setDeals)
    getUsers().then(setUsers)
  }, [])

  const cutoff = (() => {
    const now = new Date()
    if (range === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime() }
    if (range === 'week') return weekBounds(now).start.getTime()
    const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime()
  })()

  const inRange = deals.filter((d) => new Date(d.closed_at).getTime() >= cutoff)

  const board = users
    .filter((u) => u.role === 'rep' || u.role === 'sub_manager')
    .map((u) => {
      const mine = inRange.filter((d) => d.rep_id === u.id)
      return {
        ...u,
        closes: mine.length,
        revenue: money(mine.reduce((s, d) => s + d.total_price, 0)),
        commission: money(mine.reduce((s, d) => s + d.rep_commission, 0)),
      }
    })
    .sort((a, b) => b[metric] - a[metric])

  const display = (r) => metric === 'closes' ? `${r.closes} closes` : fmt0(r[metric])

  return (
    <Layout title="Leaderboard" subtitle="Earn your spot">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['day', 'week', 'month'].map((r) => (
          <button key={r} className={'pill ' + (range === r ? 'pill-green' : 'pill-dim')} onClick={() => setRange(r)} style={{ textTransform: 'capitalize' }}>{r}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['revenue', 'Revenue'], ['closes', 'Closes'], ['commission', 'Commission']].map(([m, label]) => (
          <button key={m} className={'pill ' + (metric === m ? 'pill-green' : 'pill-dim')} onClick={() => setMetric(m)}>{label}</button>
        ))}
      </div>

      <div className="card">
        {board.length === 0 && <div className="empty">No closes in this range yet.</div>}
        {board.map((r, i) => (
          <div className="row" key={r.id}>
            <div className={'rank' + (i < 3 ? ' top' : '')}>{i + 1}</div>
            <div className="avatar">{initials(r.name)}</div>
            <div className="grow">
              <div className="name">{r.name}</div>
              <div className="meta">{r.role === 'sub_manager' ? 'Team Leader' : 'Rep'} · {r.closes} closes</div>
            </div>
            <div className="amt">{display(r)}</div>
          </div>
        ))}
      </div>
      <div className="helper" style={{ textAlign: 'center', marginTop: 14 }}>
        Owners/Manager can set leaderboard rules and prizes in the admin panel.
      </div>
    </Layout>
  )
}
