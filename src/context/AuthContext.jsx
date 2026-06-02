import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { HAS_BACKEND, supabase } from '../lib/supabase.js'
import { loadDB } from '../lib/mockData.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const MOCK_SESSION_KEY = 'dab_mock_session_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
    let active = true
    const done = () => { if (active) setLoading(false) }

    async function hydrate(session) {
      try {
        if (!session?.user) { if (active) setUser(null); return }
        const { data } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle()
        if (active) setUser(data || null)
      } catch (e) {
        if (active) setUser(null)
      } finally {
        done()
      }
    }

    supabase.auth.getSession()
      .then(({ data }) => hydrate(data.session))
      .catch(() => done())

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => hydrate(session))

    // Safety net: never let the app hang on the loading screen.
    const t = setTimeout(done, 6000)

    return () => { active = false; clearTimeout(t); sub.subscription.unsubscribe() }
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

  const switchMockUser = (id) => {
    if (HAS_BACKEND) return
    const db = loadDB()
    const u = db.users.find((x) => x.id === id)
    if (u) { localStorage.setItem(MOCK_SESSION_KEY, id); setUser(u) }
  }

  const signOut = async () => {
    if (!HAS_BACKEND) {
      localStorage.removeItem(MOCK_SESSION_KEY)
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
