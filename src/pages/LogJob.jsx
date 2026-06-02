import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getPricing, getUsers, submitDeal } from '../lib/api.js'
import { SERVICES, linePrice } from '../lib/pricing.js'
import { computeCommission, fmt } from '../lib/commission.js'
import { IconPlus, IconCheck } from '../components/icons.jsx'

export default function LogJob() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [pricing, setPricing] = useState([])
  const [users, setUsers] = useState([])
  const [lines, setLines] = useState([])           // chosen services
  const [picker, setPicker] = useState('House Wash')
  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [pay, setPay] = useState('paid')
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPricing().then(setPricing)
    getUsers().then(setUsers)
  }, [])

  const tiers = pricing.filter((p) => p.service === picker)
  const total = useMemo(() => lines.reduce((s, l) => s + linePrice(l), 0), [lines])

  // live commission preview for the closer
  const preview = useMemo(() => {
    const leader = users.find((u) => u.role === 'sub_manager' && u.team_id === user?.team_id) || null
    return computeCommission({ totalPrice: total, closer: user, leader })
  }, [total, users, user])

  const addLine = (tier) => {
    const needsQty = tier.unit !== 'flat'
    setLines((prev) => [...prev, { type: tier.service, tier: tier.tier, unit: tier.unit, price: tier.price, qty: needsQty ? 0 : 1, line_price: tier.unit === 'flat' ? tier.price : 0 }])
  }
  const setQty = (i, q) => setLines((prev) => prev.map((l, j) => j === i ? { ...l, qty: Number(q) || 0, line_price: linePrice({ ...l, qty: Number(q) || 0 }) } : l))
  const removeLine = (i) => setLines((prev) => prev.filter((_, j) => j !== i))

  const submit = async () => {
    if (!total) return
    setBusy(true)
    const deal = {
      services: lines.map((l) => ({ type: l.type, tier: l.tier, qty: l.qty, line_price: linePrice(l) })),
      customer_name: customer, address, phone, total_price: total, payment_status: pay, notes,
    }
    const saved = await submitDeal({ closer: user, allUsers: users, deal })
    setBusy(false)
    setDone(saved)
  }

  if (done) {
    return (
      <Layout title="Job logged" back>
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div className="avatar" style={{ width: 56, height: 56, margin: '0 auto 14px', background: 'rgba(74,222,128,0.15)' }}>
            <IconCheck style={{ width: 28, height: 28 }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(done.total_price)} closed</div>
          <div className="helper" style={{ marginTop: 8 }}>
            You earned <b style={{ color: 'var(--dab-accent)' }}>{fmt(done.rep_commission)}</b> commission.
            Posted to #wins · pushed to scheduling.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-block" onClick={() => { setDone(null); setLines([]); setCustomer(''); setAddress(''); setPhone(''); setNotes('') }}>Log another</button>
            <button className="btn btn-primary btn-block" onClick={() => nav('/')}>Done</button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Log a job" subtitle="Quote → close → submit">
      <div className="warn-note" style={{ marginBottom: 14 }}>Reminder: oil stains are NOT guaranteed to come out.</div>

      {/* calculator */}
      <div className="card">
        <div className="card-title">Quote calculator</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {SERVICES.map((s) => (
            <button key={s} className={'pill ' + (picker === s ? 'pill-green' : 'pill-dim')} onClick={() => setPicker(s)}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tiers.map((t) => (
            <button key={t.tier} className="btn" style={{ justifyContent: 'space-between' }} onClick={() => addLine(t)}>
              <span style={{ textAlign: 'left', fontSize: 13, fontWeight: 500 }}>{t.tier}</span>
              <span style={{ color: 'var(--dab-accent)' }}>
                {t.unit === 'flat' ? fmt(t.price) : `$${t.price}/${t.unit === 'per_sqft' ? 'sqft' : 'window'}`}
                <IconPlus style={{ width: 16, height: 16, marginLeft: 6, verticalAlign: -3 }} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* chosen lines */}
      {lines.length > 0 && (
        <div className="card">
          <div className="card-title">This job</div>
          {lines.map((l, i) => (
            <div className="row" key={i}>
              <div className="grow">
                <div className="name" style={{ fontSize: 14 }}>{l.type}</div>
                <div className="meta">{l.tier}</div>
                {l.unit !== 'flat' && (
                  <input className="input" style={{ marginTop: 6, padding: '8px 10px' }} type="number" inputMode="numeric"
                    placeholder={l.unit === 'per_sqft' ? 'square feet' : 'window count'} value={l.qty || ''} onChange={(e) => setQty(i, e.target.value)} />
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="amt">{fmt(linePrice(l))}</div>
                <button className="btn-ghost btn-danger" style={{ fontSize: 12 }} onClick={() => removeLine(i)}>remove</button>
              </div>
            </div>
          ))}
          <div className="row" style={{ borderTop: '1px solid var(--dab-border)', marginTop: 6 }}>
            <div className="grow name">Total</div>
            <div className="amt" style={{ fontSize: 20 }}>{fmt(total)}</div>
          </div>
          <div className="helper" style={{ marginTop: 8 }}>
            Your commission on this job: <b style={{ color: 'var(--dab-accent)' }}>{fmt(preview.rep_commission)}</b>
            {preview.override_commission > 0 && <> · team leader override {fmt(preview.override_commission)}</>}
          </div>
        </div>
      )}

      {/* customer details */}
      <div className="card">
        <div className="card-title">Customer</div>
        <div className="field"><label>Name</label><input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" /></div>
        <div className="field"><label>Address</label><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Maple St" /></div>
        <div className="field"><label>Phone (optional)</label><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" /></div>
        <div className="field">
          <label>Payment status</label>
          <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>
            <option value="paid">Paid</option>
            <option value="invoice">Invoice</option>
            <option value="deposit">Deposit</option>
          </select>
        </div>
        <div className="field"><label>Notes (optional)</label><textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, dog, etc." /></div>
      </div>

      <button className="btn btn-primary btn-block btn-lg" disabled={!total || busy} onClick={submit}>
        {busy ? 'Submitting…' : total ? `Submit job — ${fmt(total)}` : 'Add a service to start'}
      </button>
      <div className="helper" style={{ textAlign: 'center', marginTop: 10, marginBottom: 8 }}>
        On submit: commission calculates, posts to #wins, updates the leaderboard, and pushes to scheduling.
      </div>
    </Layout>
  )
}
