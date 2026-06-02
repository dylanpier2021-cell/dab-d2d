import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getTerritories, getUsers, getTeams, getKnocks, saveKnock, subscribeKnocks,
  createTerritory, updateTerritory, deleteTerritory,
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
  const [tab, setTab] = useState('map')
  const [form, setForm] = useState({ neighborhood: '', street: '', assigned_team_id: '' })
  const [houseInput, setHouseInput] = useState({})   // {territoryId: "text"}

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
  const repsOfTeam = (teamId) => users.filter((u) => u.role === 'rep' && u.team_id === teamId)
  // can the current user hand THIS street to a rep / edit its houses?
  const canManageStreet = (t) =>
    isAdmin ||
    (teams.find((tm) => tm.id === t.assigned_team_id)?.sub_manager_id === user.id) ||
    (user.role === 'sub_manager' && t.assigned_team_id === user.team_id)

  const cycle = async (territory, house) => {
    const address = addrKey(territory.street, house)
    const cur = knocks[address]?.status || 'not_knocked'
    const next = order[(order.indexOf(cur) + 1) % order.length]
    const row = { address, status: next, rep_id: user.id, territory_id: territory.id, updated_at: new Date().toISOString() }
    const updated = { ...knocks, [address]: row }
    setKnocks(updated); writeLocal(Object.values(updated))
    await saveKnock(row)
  }

  // streets this user can SEE on the map
  const visible = terr.filter((t) => {
    if (isAdmin) return true
    if (user.role === 'sub_manager') return t.assigned_team_id === user.team_id
    return t.assigned_rep_id === user.id || t.assigned_team_id === user.team_id
  })
  const cur = visible.find((t) => t.id === active) || visible[0]

  // ----- assignment -----
  const addStreet = async () => {
    if (!form.street) return
    const team_id = isAdmin ? (form.assigned_team_id || null) : user.team_id
    await createTerritory({ neighborhood: form.neighborhood || 'Neighborhood', street: form.street, assigned_team_id: team_id, houses: [] })
    setForm({ neighborhood: form.neighborhood, street: '', assigned_team_id: form.assigned_team_id })
    reloadTerr()
  }
  const addHouse = async (t) => {
    const val = (houseInput[t.id] || '').trim()
    if (!val) return
    const houses = Array.from(new Set([...(t.houses || []), val]))
    await updateTerritory(t.id, { houses })
    setHouseInput((p) => ({ ...p, [t.id]: '' }))
    reloadTerr()
  }
  const removeHouse = async (t, h) => {
    await updateTerritory(t.id, { houses: (t.houses || []).filter((x) => x !== h) })
    reloadTerr()
  }
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
            <div className="field"><label>Neighborhood</label><input className="input" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="e.g. Westside" /></div>
            <div className="field"><label>Street</label><input className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} placeholder="e.g. Elm St" /></div>
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
          {assignable.length === 0 && <div className="card"><div className="empty">No streets yet. Add one above.</div></div>}
          {assignable.map((t) => {
            const manage = canManageStreet(t)
            return (
              <div className="card" key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="name">{t.street}</div>
                    <div className="meta">{t.neighborhood} · {teamName(teams, t.assigned_team_id)}</div>
                  </div>
                  {isAdmin && <button className="btn-ghost btn-danger" style={{ fontSize: 12 }} onClick={async () => { await deleteTerritory(t.id); reloadTerr() }}>remove</button>}
                </div>

                {/* hand the street to a specific rep on that team */}
                {manage && (
                  <div className="field" style={{ marginTop: 10, marginBottom: 6 }}>
                    <label>Give this street to</label>
                    <select className="input" value={t.assigned_rep_id || ''} onChange={async (e) => { await updateTerritory(t.id, { assigned_rep_id: e.target.value || null }); reloadTerr() }}>
                      <option value="">Whole team</option>
                      {repsOfTeam(t.assigned_team_id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                )}

                {/* real houses on this street */}
                {manage && (
                  <div style={{ marginTop: 6 }}>
                    <label className="meta">Houses on this street</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
                      {(t.houses || []).length === 0 && <span className="meta">None yet.</span>}
                      {(t.houses || []).map((h) => (
                        <span key={h} className="pill pill-dim">{h}<button onClick={() => removeHouse(t, h)} style={{ background: 'none', border: 'none', color: 'var(--dab-danger)', cursor: 'pointer', marginLeft: 4 }}>×</button></span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="input" value={houseInput[t.id] || ''} onChange={(e) => setHouseInput((p) => ({ ...p, [t.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && addHouse(t)} placeholder="House # or address" />
                      <button className="btn" onClick={() => addHouse(t)}>Add</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
                  {(cur.houses || []).length === 0 ? (
                    <div className="empty">No houses on this street yet. {canManageStreet(cur) ? 'Add them in the Assign tab.' : 'Ask your team leader to add them.'}</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {(cur.houses || []).map((h) => {
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
                  )}
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
