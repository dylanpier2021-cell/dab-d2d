import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { signIn, HAS_BACKEND } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setErr(error)
    else nav('/')
  }

  return (
    <div className="login-wrap">
      <div className="brand-lock">
        <div className="mark">DAB<span className="logo-dot">.</span></div>
        <div className="tag">Pressure Washing — Sales Hub</div>
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={email} autoCapitalize="none"
            onChange={(e) => setEmail(e.target.value)} placeholder="you@dab.com" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {err && <div className="warn-note" style={{ marginBottom: 12 }}>{err}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {!HAS_BACKEND && (
        <div className="helper" style={{ marginTop: 20, textAlign: 'center' }}>
          Demo mode — try <b>dylan@dab.com</b> (owner), <b>dom@dab.com</b> (team leader),
          or <b>mike@dab.com</b> (rep). Any password works.
        </div>
      )}
    </div>
  )
}
