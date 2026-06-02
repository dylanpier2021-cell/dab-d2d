import { useState } from 'react'
import { DEFAULT_RATES } from '../../lib/commission.js'

const ROLES = [
  ['rep', 'Rep'],
  ['sub_manager', 'Team Leader'],
  ['manager', 'Manager'],
  ['owner', 'Owner'],
]

// Owner/Manager edit anyone. (Sub-managers get a reduced version via team view.)
export default function UserEditor({ draft, users, teams, onSave, onCancel }) {
  const [f, setF] = useState(draft)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  // When role changes, snap commission/override to the role defaults (still editable).
  const changeRole = (role) => {
    const d = DEFAULT_RATES[role] || DEFAULT_RATES.rep
    setF((p) => ({ ...p, role, commission_rate: d.commission_rate, override_rate: d.override_rate }))
  }

  const leaders = users.filter((u) => u.role === 'sub_manager' || u.role === 'manager')

  return (
    <div>
      <div className="card">
        <div className="field"><label>Name</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field"><label>Email</label><input className="input" type="email" autoCapitalize="none" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>

        <div className="field">
          <label>Role</label>
          <select className="input" value={f.role} onChange={(e) => changeRole(e.target.value)}>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {(f.role === 'rep' || f.role === 'sub_manager') && (
          <div className="field">
            <label>Team</label>
            <select className="input" value={f.team_id || ''} onChange={(e) => set('team_id', e.target.value || null)}>
              <option value="">— none —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label>Reports to</label>
          <select className="input" value={f.reports_to_id || ''} onChange={(e) => set('reports_to_id', e.target.value || null)}>
            <option value="">— none —</option>
            {leaders.filter((l) => l.id !== f.id).map((l) => <option key={l.id} value={l.id}>{l.name} ({l.role === 'manager' ? 'Manager' : 'Team Leader'})</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Commission rates</div>
        <div className="stat-grid">
          <div className="field" style={{ margin: 0 }}>
            <label>On own jobs (%)</label>
            <input className="input" type="number" step="1" value={Math.round(f.commission_rate * 100)} onChange={(e) => set('commission_rate', (Number(e.target.value) || 0) / 100)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Team override (%)</label>
            <input className="input" type="number" step="1" value={Math.round(f.override_rate * 100)} onChange={(e) => set('override_rate', (Number(e.target.value) || 0) / 100)} />
          </div>
        </div>
        <div className="helper" style={{ marginTop: 10 }}>
          Defaults: Rep 10% · Team Leader 12% + 2% override. Override only applies to a Team Leader on their reps' jobs.
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ borderBottom: 'none', padding: '4px 0' }}>
          <div className="grow name">Active</div>
          <button className={'pill ' + (f.active ? 'pill-green' : 'pill-dim')} onClick={() => set('active', !f.active)}>{f.active ? 'Active' : 'Inactive'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn btn-block" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-block" disabled={!f.name || !f.email} onClick={() => onSave(f)}>Save</button>
      </div>
    </div>
  )
}
