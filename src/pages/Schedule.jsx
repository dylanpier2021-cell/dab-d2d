import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getShifts, createShift, deleteShift, getRsvps, setRsvp, getUsers, getTeams, subscribeShifts } from '../lib/api.js'

const initials = (n = '') => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const todayStr = () => new Date().toISOString().slice(0, 10)
const CAL_URL = import.meta.env.VITE_GHL_CALENDAR_URL

function prettyDate(d) {
  const dt = new Date(d + 'T00:00:00')
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const diff = Math.round((dt - t) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
function pretty12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const hr = ((h + 11) % 12) + 1
  return m ? `${hr}:${String(m).padStart(2, '0')}${ap}` : `${hr}${ap}`
}

export default function Schedule() {
  const { user, isAdmin } = useAuth()
  const canPost = isAdmin || user?.role === 'sub_manager'

  const [view, setView] = useState('jobs')   // jobs (GHL calendar) | crew (shift board)
  const [shifts, setShifts] = useState([])
  const [rsvps, setRsvps] = useState([])
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ label: '', shift_date: todayStr(), start_time: '14:00', end_time: '17:00', team_id: '' })

  const reload = () => { getShifts().then(setShifts); getRsvps().then(setRsvps) }
  useEffect(() => {
    reload(); getUsers().then(setUsers); getTeams().then(setTeams)
    const unsub = subscribeShifts(reload)
    return unsub
  }, [])

  // load GHL's resize helper once
  useEffect(() => {
    if (!CAL_URL) return
    if (document.getElementById('ghl-embed-js')) return
    const s = document.createElement('script')
    s.src = 'https://link.msgsndr.com/js/form_embed.js'
    s.id = 'ghl-embed-js'; s.async = true
    document.body.appendChild(s)
  }, [])

  const nameOf = (id) => users.find((u) => u.id === id)?.name || 'Someone'
  const myStatus = (shiftId) => rsvps.find((r) => r.shift_id === shiftId && r.user_id === user.id)?.status
  const goingList = (shiftId) => rsvps.filter((r) => r.shift_id === shiftId && r.status === 'going')

  const rsvp = async (shift_id, status) => {
    const next = myStatus(shift_id) === status ? 'none' : status
    setRsvps((prev) => {
      const others = prev.filter((r) => !(r.shift_id === shift_id && r.user_id === user.id))
      return next === 'none' ? others : [...others, { shift_id, user_id: user.id, status: next }]
    })
    await setRsvp({ shift_id, user_id: user.id, status: next })
  }

  const post = async () => {
    if (!f.shift_date) return
    await createShift({ ...f, team_id: f.team_id || null, created_by: user.id })
    setShowForm(false)
    setF({ label: '', shift_date: todayStr(), start_time: '14:00', end_time: '17:00', team_id: '' })
    reload()
  }

  const upcoming = [...shifts]
    .filter((s) => s.shift_date >= todayStr())
    .sort((a, b) => (a.shift_date + a.start_time).localeCompare(b.shift_date + b.start_time))

  return (
    <Layout title="Schedule" subtitle={view === 'jobs' ? 'Is there room to book?' : "Who's rolling out"}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className={'pill ' + (view === 'jobs' ? 'pill-green' : 'pill-dim')} onClick={() => setView('jobs')}>Job calendar</button>
        <button className={'pill ' + (view === 'crew' ? 'pill-green' : 'pill-dim')} onClick={() => setView('crew')}>Crew shifts</button>
      </div>

      {view === 'jobs' && (
        CAL_URL ? (
          <div className="card" style={{ padding: 6 }}>
            <div className="helper" style={{ padding: '6px 8px 10px' }}>
              Closed a job at the door? Check here for an open time and book it in. Greyed-out
              slots are taken — already-booked jobs or blocked-off hours. Open slots are free.
            </div>
            <iframe
              src={CAL_URL}
              title="Job booking calendar"
              style={{ width: '100%', height: 760, border: 'none', borderRadius: 10, background: '#fff' }}
            />
            <div className="helper" style={{ padding: '8px 8px 2px' }}>
              Crew set their own availability and jobs in GoHighLevel — blocked time shows up here automatically.
            </div>
          </div>
        ) : (
          <div className="card"><div className="empty">Job calendar isn’t connected yet.</div></div>
        )
      )}

      {view === 'crew' && (
        <>
          {canPost && !showForm && (
            <button className="btn btn-primary btn-block" style={{ marginBottom: 14 }} onClick={() => setShowForm(true)}>+ Post a shift</button>
          )}
          {canPost && showForm && (
            <div className="card">
              <div className="card-title">New shift</div>
              <div className="field"><label>Label (optional)</label><input className="input" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Afternoon knock session" /></div>
              <div className="field"><label>Date</label><input className="input" type="date" value={f.shift_date} onChange={(e) => setF({ ...f, shift_date: e.target.value })} /></div>
              <div className="stat-grid">
                <div className="field" style={{ margin: 0 }}><label>Start</label><input className="input" type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></div>
                <div className="field" style={{ margin: 0 }}><label>End</label><input className="input" type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} /></div>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>For</label>
                <select className="input" value={f.team_id} onChange={(e) => setF({ ...f, team_id: e.target.value })}>
                  <option value="">Whole company</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-block" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary btn-block" onClick={post}>Post</button>
              </div>
            </div>
          )}

          {upcoming.length === 0 && <div className="card"><div className="empty">No shifts posted yet.</div></div>}

          {upcoming.map((s) => {
            const going = goingList(s.id)
            const mine = myStatus(s.id)
            const teamName = teams.find((t) => t.id === s.team_id)?.name
            return (
              <div className="card" key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{prettyDate(s.shift_date)} · {pretty12(s.start_time)}–{pretty12(s.end_time)}</div>
                    <div className="meta">{s.label || 'Knock session'}{teamName ? ` · ${teamName}` : ' · Whole company'}</div>
                  </div>
                  <span className="pill pill-green">{going.length} going</span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className={'btn btn-block' + (mine === 'going' ? ' btn-primary' : '')} onClick={() => rsvp(s.id, 'going')}>Going</button>
                  <button className={'btn btn-block' + (mine === 'not_going' ? ' btn-danger' : '')} onClick={() => rsvp(s.id, 'not_going')}>Can't make it</button>
                </div>
                {going.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {going.map((r) => (
                      <span key={r.user_id} className="pill pill-dim"><span className="avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{initials(nameOf(r.user_id))}</span>{nameOf(r.user_id).split(' ')[0]}</span>
                    ))}
                  </div>
                )}
                {canPost && <button className="btn-ghost btn-danger" style={{ fontSize: 12, marginTop: 10 }} onClick={async () => { await deleteShift(s.id); reload() }}>Delete shift</button>}
              </div>
            )
          })}
        </>
      )}
    </Layout>
  )
}
