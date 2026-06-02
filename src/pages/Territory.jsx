import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getTerritories, getUsers, getTeams, getKnocks, saveKnock, subscribeKnocks,
  createTerritory, assignTerritory, deleteTerritory,
} from '../lib/api.js'

const STATUSES = [
  { key: 'not_knocked', label: 'Not knocked', color: '#3a4f44', text: '#9bb3a7' },
  { key: 'no_answer', label: 'No answer', color: '#FAC775', text: '#412402' },
  { key: 'not_interested', label: 'Not interested', color: '#F09595', text: '#501313' },
  { key: 'follow_up', label: 'Follow-up', color: '#85B7EB', text: '#042C53' },
  { key: 'closed', label: 'Closed', color: '#4ade80', text: '#06231a' },
]
const order = STATUSES.map((s) => s.key)
const meta = Object.fromEntries(STATUSES.map((s) => [s.key, s]))

const LS_KEY = 'dab_knocks_v1'
const writeLocal = (rows) => { try { localStorage.setItem(LS_KEY, JSON.stringify(rows)) } catch {} }
const housesFor = () => Array.from({ length: 10 }, (_, i) => `${100 + i * 2}`)
const addrKey = (street, house) => `${street} #${house}`
const indexBy = (rows) => { const o = {}; for (const r of rows || []) o[r.address] = r; return o }
const teamName = (teams, id) => teams.find((t) => t.id === id)?.name || 'Unassigned'

export default function Territory() {
  const { user, isAdmin } = useAuth()
  const [terr, setTerr] = useState([])
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [knocks, setKnocks] = useState({})
  const [active, setActive] = useState(null)
  const [tab, setTab] = useState('map')        // map | assign
  const [form, setForm] = useState({ neighborhood: '', street: '', assigned_team_id: '' })

  const reloadTerr = () => getTerritories().then((t) => { setTerr(t); setActive((a) => a || t[0]?.id || null) })

  useEffect(() => {
    reloadTerr()
    getUsers().then(setUsers)
    getTeams().then(setTeams)
    getKnocks().then((rows) => setKnocks(indexBy(rows)))
    const unsub = subscribeKnocks((row) => setKnocks((prev) => ({ ...prev, [row.address]: row })))
    return unsub
  }, [])

  const canAssign = isAdmin || user.role === 'sub_manager'
  const nameOf = (id) => users.find((u) => u.id === id)?.name?.split(' ')[0] || ''

  const cycle = async (territory, house) => {
    const address = addrKey(territory.street, house)
    const cur = knocks[address]?.status || 'not_knocked'
    const next = order[(order.indexOf(cur) + 1) % order.length]
    const row = { address, status: next, rep_id: user.id, territory_id: territory.id, updated_at: new Date().toISOString() }
    const updated = { ...knocks, [address]: row }
    setKnocks(updated); writeLocal(Object.values(updated))
    await saveKnock(row)
  }

  // scope of streets this user can SEE
  const visible = terr.filter((t) => {
    if (isAdmin) return true
    if (user.role === 'sub_manager') return t.assigned_team_id === user.team_id
    return t.assigned_rep_id === user.id || t.assigned_team_id === user.team_id
  })
  const cur = visible.find((t) => t.id === active) || visible[0]

  // ----- assignment helpers -----
  const myTeamReps = users.filter((u) => u.role === 'rep' && u.team_id === user.team_id)
  const addStreet = async () => {
    if (!form.street) return
    await createTerritory({ neighborhood: form.neighborhood || 'Neighborhood', street: form.street, assigned_team_id: form.assigned_team_id || (user.role === 'sub_manager' ? user.team_id : null) })
    setForm({ neighborhood: form.neighborhood, street: '', assigned_team_id: form.assigned_team_id })
    reloadTerr()
  }
  // which streets show in the assign tab
  const assignable = isAdmin ? terr : terr.filter((t) => t.assigned_team_id === user.team_id)

  return (
    <Layout title="Territory" subtitle={tab === 'assign' ? 'Assign streets' : 'Live door-knock map'}>
      {canAssign && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button className={'pill ' + (tab === 'map' ? 'pill-green' : 'pill-dim')} onClick={() => setTab('map')}>Map</button>
          <button className={'pill ' + (tab === 'assign' ? 'pill-green' : 'pill-dim')} onClick={() => setTab('assign')}>Assign</button>
        </div>
      )}

      {tab === 'assign' && canAssign && (
        <>
          <div className="card">
            <div className="card-title">{isAdmin ? 'Add a street to a team' : 'Add a street for my team'}</div>
            <div className="field"><label>Neighborhood</label><input className="input" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Maple Heights" /></div>
            <div className="field"><label>Street</label><input className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="Maple St" /></div>
            {isAdmin && (
              <div className="field">
                <label>Assign to team</label>
                <select className="input" value={form.assigned_team_id} onChange={(e) => setForm({ ...form, assigned_team_id: e.target.value })}>
                  <option value="">— pick a team —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={addStreet}>Add street</button>
          </div>

          <div className="section-label">{isAdmin ? 'All streets' : 'My team’s streets'}</div>
          <div className="card">
            {assignable.length === 0 && <div className="empty">No streets yet.</div>}
            {assignable.map((t) => (
              <div className="row" key={t.id} style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="name">{t.street}</div>
                  <div className="meta">{t.neighborhood} · {teamName(teams, t.assigned_team_id)}</div>
                  {/* team leaders + admins hand a street to a specific rep */}
                  {(user.role === 'sub_manager' && t.assigned_team_id === user.team_id) && (
                    <select className="input" style={{ marginTop: 8 }} value={t.assigned_rep_id || ''} onChange={async (e) => { await assignTerritory(t.id, e.target.value || null); reloadTerr() }}>
                      <option value="">Whole team</option>
                      {myTeamReps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                  {t.assigned_rep_id && user.role !== 'sub_manager' && <div className="meta" style={{ marginTop: 4 }}>Rep: {nameOf(t.assigned_rep_id)}</div>}
                </div>
                {isAdmin && <button className="btn-ghost btn-danger" style={{ fontSize: 12 }} onClick={async () => { await deleteTerritory(t.id); reloadTerr() }}>remove</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'map' && (
        <>
          {visible.length === 0 && <div className="card"><div className="empty">No streets assigned to you yet.</div></div>}
          {visible.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
                {visible.map((t) => (
                  <button key={t.id} className={'pill ' + (cur?.id === t.id ? 'pill-green' : 'pill-dim')} onClick={() => setActive(t.id)} style={{ whiteSpace: 'nowrap' }}>{t.street || t.neighborhood}</button>
                ))}
              </div>
              {cur && (
                <div className="card">
                  <div className="card-title">{cur.neighborhood} · {cur.street}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {housesFor().map((h) => {
                      const k = knocks[addrKey(cur.street, h)]
                      const m = meta[k?.status || 'not_knocked']
                      const by = k?.rep_id ? nameOf(k.rep_id) : ''
                      return (
                        <button key={h} onClick={() => cycle(cur, h)} style={{ aspectRatio: '1', borderRadius: 10, background: m.color, color: m.text, fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.15)' }}>
                          {h}{by && <span style={{ fontSize: 8, fontWeight: 500, marginTop: 2 }}>{by}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <div className="helper" style={{ marginTop: 10 }}>Tap a house to log a knock. Status syncs to the whole team instantly.</div>
                </div>
              )}
              <div className="card">
                <div className="card-title">Legend</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                  {STATUSES.map((s) => (
                    <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} /> {s.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  )
}
