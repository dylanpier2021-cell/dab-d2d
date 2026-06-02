import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getChannels, getMessages, sendMessage, getUsers, subscribeMessages } from '../lib/api.js'

const initials = (n = '') => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function Chat() {
  const { user } = useAuth()
  const [channels, setChannels] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [text, setText] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    getChannels().then((c) => { setChannels(c); setActive(c[0]?.id || null) })
    getUsers().then(setUsers)
  }, [])

  const loadMsgs = () => { if (active) getMessages(active).then(setMessages) }

  useEffect(() => {
    if (!active) return
    loadMsgs()
    const unsub = subscribeMessages(active, (msg) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
    })
    return unsub
  }, [active])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!text.trim() || !active) return
    const body = text.trim()
    setText('')
    await sendMessage({ channelId: active, authorId: user.id, body })
    loadMsgs()
  }

  const nameOf = (id) => users.find((u) => u.id === id)?.name || 'Someone'
  const isWins = channels.find((c) => c.id === active)?.slug === 'wins'

  return (
    <Layout title="Team chat" subtitle="Keep it tight">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
        {channels.map((c) => (
          <button key={c.id} className={'pill ' + (active === c.id ? 'pill-green' : 'pill-dim')} onClick={() => setActive(c.id)} style={{ whiteSpace: 'nowrap' }}>{c.name}</button>
        ))}
      </div>

      <div className="card" style={{ minHeight: 320 }}>
        {messages.length === 0 && <div className="empty">No messages yet.</div>}
        {messages.map((m) => (
          <div className="row" key={m.id} style={{ alignItems: 'flex-start' }}>
            <div className="avatar" style={isWins && m.deal_id ? { background: 'rgba(74,222,128,0.15)' } : {}}>{initials(nameOf(m.author_id))}</div>
            <div className="grow">
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span className="name" style={{ fontSize: 14 }}>{nameOf(m.author_id)}</span>
                {isWins && m.deal_id && <span className="pill pill-green">win</span>}
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>{m.body}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Message…" />
        <button className="btn btn-primary" onClick={send}>Send</button>
      </div>
      <div className="helper" style={{ marginTop: 10 }}>#wins auto-posts every closed deal. Keep #general light and #losses-learnings honest.</div>
    </Layout>
  )
}
