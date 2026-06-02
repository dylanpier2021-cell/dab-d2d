import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getDeals, getUsers, getTeams } from '../lib/api.js'
import { rollupByUser, inThisWeek, fmt, fmt0, money } from '../lib/commission.js'
import { IconBolt, IconPlus } from '../components/icons.jsx'

const initials = (n = '') => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [deals, setDeals] = useState([])
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([getDeals(), getUsers(), getTeams()]).then(([d, u, t]) => {
      setDeals(d); setUsers(u); setTeams(t); setReady(true)
    })
  }, [])

  if (!ready || !user) return <Layout subtitle="Loading…"><div className="empty">Loading…</div></Layout>

  const week = deals.filter((d) => inThisWeek(d.closed_at))
  const rollup = rollupByUser(week)

  const isRep = user.role === 'rep'
  const isLeader = user.role === 'sub_manager'

  // scope deals to what this role can see
  let scoped = week
  if (isRep) scoped = week.filter((d) => d.rep_id === user.id)
  else if (isLeader) scoped = week.filter((d) => d.team_id === user.team_id)

  const greeting = `${timeGreeting()}, ${user.name.split(' ')[0]}`

  return (
    <Layout subtitle={greeting}>
      {isRep && <RepView user={user} deals={scoped} rollup={rollup} users={users} nav={nav} />}
      {isLeader && <LeaderView user={user} deals={scoped} rollup={rollup} users={users} teams={teams} nav={nav} />}
      {(user.role === 'owner' || user.role === 'manager') &&
        <OwnerView deals={week} rollup={rollup} users={users} teams={teams} nav={nav} />}
    </Layout>
  )
}

function timeGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function BigLogButton({ nav }) {
  return (
    <button className="btn btn-primary btn-block btn-lg" style={{ marginBottom: 16 }} onClick={() => nav('/log')}>
      <IconBolt style={{ width: 20, height: 20 }} /> Log a job
    </button>
  )
}

// ---- REP --------------------------------------------------------------------
function RepView({ user, deals, rollup, nav }) {
  const me = rollup[user.id] || { revenue: 0, commission: 0 }
  return (
    <>
      <BigLogButton nav={nav} />
      <div className="stat-grid">
        <Stat label="My closes (wk)" value={deals.length} />
        <Stat label="My revenue" value={fmt0(me.revenue)} />
        <Stat label="My commission" value={fmt(me.commission)} accent />
        <Stat label="Avg ticket" value={deals.length ? fmt0(me.revenue / deals.length) : '$0'} />
      </div>
      <div className="section-label">My recent closes</div>
      <DealList deals={deals} emptyText="No closes yet this week. Go knock some doors." />
    </>
  )
}

// ---- SUB-MANAGER ------------------------------------------------------------
function LeaderView({ user, deals, rollup, users, nav }) {
  const teamRevenue = money(deals.reduce((s, d) => s + d.total_price, 0))
  const me = rollup[user.id] || { commission: 0, override: 0 }
  const team = users.filter((u) => u.team_id === user.team_id && u.role === 'rep')
  return (
    <>
      <BigLogButton nav={nav} />
      <div className="stat-grid">
        <Stat label="Team revenue (wk)" value={fmt0(teamRevenue)} />
        <Stat label="Team closes" value={deals.length} />
        <Stat label="My override" value={fmt(me.override)} accent />
        <Stat label="My commission" value={fmt(me.commission)} accent />
      </div>

      <div className="section-label">My reps</div>
      <div className="card">
        {team.length === 0 && <div className="empty">No reps assigned yet.</div>}
        {team.map((r) => {
          const stats = rollup[r.id] || { revenue: 0, commission: 0 }
          return (
            <div className="row" key={r.id}>
              <div className="avatar">{initials(r.name)}</div>
              <div className="grow">
                <div className="name">{r.name}</div>
                <div className="meta">{deals.filter((d) => d.rep_id === r.id).length} closes</div>
              </div>
              <div className="amt">{fmt0(stats.revenue)}</div>
            </div>
          )
        })}
      </div>

      <div className="section-label">Team activity</div>
      <DealList deals={deals} users={users} showRep emptyText="No team closes yet this week." />
    </>
  )
}

// ---- OWNER / MANAGER --------------------------------------------------------
function OwnerView({ deals, rollup, users, teams, nav }) {
  const revenue = money(deals.reduce((s, d) => s + d.total_price, 0))
  const totalComm = money(Object.values(rollup).reduce((s, r) => s + r.total, 0))
  const net = money(revenue - totalComm)
  return (
    <>
      <div className="stat-grid">
        <Stat label="Company revenue (wk)" value={fmt0(revenue)} />
        <Stat label="Closes" value={deals.length} />
        <Stat label="Commission owed" value={fmt0(totalComm)} accent />
        <Stat label="Net after comm." value={fmt0(net)} />
      </div>

      <div className="section-label">Teams this week</div>
      <div className="card">
        {teams.map((t) => {
          const td = deals.filter((d) => d.team_id === t.id)
          const rev = money(td.reduce((s, d) => s + d.total_price, 0))
          return (
            <div className="row" key={t.id}>
              <div className="grow">
                <div className="name">{t.name}</div>
                <div className="meta">{td.length} closes</div>
              </div>
              <div className="amt">{fmt0(rev)}</div>
            </div>
          )
        })}
      </div>

      <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Latest closes</span>
        <span onClick={() => nav('/admin')} style={{ color: 'var(--dab-accent)', cursor: 'pointer' }}>Manage →</span>
      </div>
      <DealList deals={deals.slice(0, 8)} users={users} showRep emptyText="No closes yet this week." />
    </>
  )
}

// ---- shared -----------------------------------------------------------------
function Stat({ label, value, accent }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className={'value' + (accent ? ' accent' : '')}>{value}</div>
    </div>
  )
}

function DealList({ deals, users = [], showRep, emptyText }) {
  if (!deals.length) return <div className="card"><div className="empty">{emptyText}</div></div>
  const nameOf = (id) => users.find((u) => u.id === id)?.name || ''
  return (
    <div className="card">
      {deals.map((d) => (
        <div className="row" key={d.id}>
          <div className="grow">
            <div className="name">{d.customer_name || 'Job'}</div>
            <div className="meta">
              {d.services?.[0]?.type}{showRep ? ` · ${nameOf(d.rep_id)}` : ''} · {timeAgo(d.closed_at)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="amt">{fmt0(d.total_price)}</div>
            {d.status === 'submitted' && <span className="pill pill-amber" style={{ marginTop: 4 }}>review</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
