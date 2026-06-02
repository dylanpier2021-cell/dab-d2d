import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { HAS_BACKEND, supabase } from '../lib/supabase.js'
import { loadDB } from '../lib/mockData.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const MOCK_SESSION_KEY = 'dab_mock_session_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)   // the profile row (with role)
  const [loading, setLoading] = useState(true)

  // ---- MOCK MODE: auto-sign-in as Dylan (owner) -----------------------------
  const loadMockUser = useCallback(() => {
    const db = loadDB()
    const savedId = localStorage.getItem(MOCK_SESSION_KEY)
    const u = db.users.find((x) => x.id === savedId) || db.users.find((x) => x.id === 'u-dylan')
    setUser(u || null)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!HAS_BACKEND) {
      loadMockUser()
      return
    }
    // ---- REAL MODE: hydrate from Supabase session ---------------------------
    let active = true
    async function hydrate(session) {
      if (!session?.user) {
        if (active) { setUser(null); setLoading(false) }
        return
      }
      const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      if (active) { setUser(data || null); setLoading(false) }
    }
    supabase.auth.getSession().then(({ data }) => hydrate(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => hydrate(session))
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadMockUser])

  const signIn = async (email, password) => {
    if (!HAS_BACKEND) {
      const db = loadDB()
      const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase())
      if (!u) return { error: 'No user with that email in the demo roster.' }
      localStorage.setItem(MOCK_SESSION_KEY, u.id)
      setUser(u)
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message || null }
  }

  // Mock-mode helper: jump into any role to test what they see.
  const switchMockUser = (id) => {
    if (HAS_BACKEND) return
    const db = loadDB()
    const u = db.users.find((x) => x.id === id)
    if (u) { localStorage.setItem(MOCK_SESSION_KEY, id); setUser(u) }
  }

  const signOut = async () => {
    if (!HAS_BACKEND) {
      localStorage.removeItem(MOCK_SESSION_KEY)
      // in mock mode there's no real logout target; drop back to Dylan
      loadMockUser()
      return
    }
    await supabase.auth.signOut()
    setUser(null)
  }

  const isAdmin = user && (user.role === 'owner' || user.role === 'manager')

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, switchMockUser, isAdmin, HAS_BACKEND }}>
      {children}
    </AuthCtx.Provider>
  )
}
