import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getUsers } from '../lib/api.js'
import { IconLogout } from '../components/icons.jsx'
import { resetDB } from '../lib/mockData.js'

const roleLabel = { owner: 'Owner', manager: 'Manager', sub_manager: 'Team Leader', rep: 'Rep' }

export default function Profile() {
  const { user, signOut, switchMockUser, HAS_BACKEND } = useAuth()
  const [users, setUsers] = useState([])
  useEffect(() => { getUsers().then(setUsers) }, [])

  return (
    <Layout title="Profile" back>
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, margin: '0 auto 12px' }}>
          {(user?.name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{user?.name}</div>
        <div className="helper">{user?.email}</div>
        <span className="role-chip" style={{ marginTop: 10, display: 'inline-block' }}>{roleLabel[user?.role]}</span>
      </div>

      {!HAS_BACKEND && (
        <div className="card">
          <div className="card-title">Demo: view as another role</div>
          <div className="helper" style={{ marginBottom: 10 }}>Jump into any account to see exactly what they see. (Demo only — real login uses email + password.)</div>
          <select className="input" value={user?.id} onChange={(e) => switchMockUser(e.target.value)}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {roleLabel[u.role]}</option>)}
          </select>
          <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => { resetDB(); location.reload() }}>Reset demo data</button>
        </div>
      )}

      <button className="btn btn-block btn-danger" style={{ marginTop: 4 }} onClick={signOut}>
        <IconLogout style={{ width: 18, height: 18 }} /> Sign out
      </button>
    </Layout>
  )
}
