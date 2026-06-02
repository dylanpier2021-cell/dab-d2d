import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getUsers, getTeams, getDeals, saveUser, createTeam } from '../../lib/api.js'
import { DEFAULT_RATES } from '../../lib/commission.js'
import UserEditor from './UserEditor.jsx'
import WeeklyReport from './WeeklyReport.jsx'

const initials = (n = '') => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const roleLabel = { owner: 'Owner', manager: 'Manager', sub_manager: 'Team Leader', rep: 'Rep' }

export default function Admin() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState('people')
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [deals, setDeals] = useState([])
  const [editing, setEditing] = useState(null)

  const reload = () => {
    getUsers().then(setUsers)
    getTeams().then(setTeams)
    getDeals().then(setDeals)
  }
  useEffect(reload, [])

  if (user && !isAdmin) return <Navigate to="/" replace />

  const onSave = async (u) => { await saveUser(u); setEditing(null); reload() }
  const addPerson = () => setEditing({
    name: '', email: '', role: 'rep', team_id: teams[0]?.id || null,
    reports_to_id: null, ...DEFAULT_RATES.rep, active: true, _new: true,
  })
  const addTeam = async () => {
    const name = prompt('Team name?')
    if (name) { await createTeam({ name, sub_manager_id: null }); reload() }
  }

  if (editing) return (
    <Layout title={editing._new ? 'Add person' : 'Edit person'} back>
      <UserEditor draft={editing} users={users} teams={teams} onSave={onSave} onCancel={() => setEditing(null)} />
    </Layout>
  )

  return (
    <Layout title="Admin" subtitle="Manage the team">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['people', 'People'], ['teams', 'Teams'], ['payouts', 'Payouts']].map(([k, label]) => (
          <button key={k} className={'pill ' + (tab === k ? 'pill-green' : 'pill-dim')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'people' && (
        <>
          <button className="btn btn-primary btn-block" style={{ marginBottom: 12 }} onClick={addPerson}>+ Add person</button>
          <div className="card">
            {users.map((u) => (
              <div className="row" key={u.id} onClick={() => setEditing(u)} style={{ cursor: 'pointer' }}>
                <div className="avatar">{initials(u.name)}</div>
                <div className="grow">
                  <div className="name">{u.name} {!u.active && <span className="pill pill-dim">inactive</span>}</div>
                  <div className="meta">{u.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="role-chip">{roleLabel[u.role]}</span>
                  <div className="meta" style={{ marginTop: 4 }}>{teams.find((t) => t.id === u.team_id)?.name || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'teams' && (
        <>
          <button className="btn btn-primary btn-block" style={{ marginBottom: 12 }} onClick={addTeam}>+ New team</button>
          <div className="card">
            {teams.map((t) => {
              const leader = users.find((u) => u.id === t.sub_manager_id)
              const members = users.filter((u) => u.team_id === t.id)
              return (
                <div className="row" key={t.id}>
                  <div className="grow">
                    <div className="name">{t.name}</div>
                    <div className="meta">Leader: {leader?.name || 'unassigned'} · {members.length} members</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="helper" style={{ marginTop: 12 }}>Set a team's leader by editing that person and choosing role "Team Leader" + the team.</div>
        </>
      )}

      {tab === 'payouts' && <WeeklyReport deals={deals} users={users} teams={teams} />}
    </Layout>
  )
}
