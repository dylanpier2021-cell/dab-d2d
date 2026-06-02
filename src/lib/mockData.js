// ============================================================================
// Mock backend — lets the whole app run with NO Supabase project.
// Data persists in localStorage so changes (new users, roles, deals) stick
// during a session. When you add real Supabase keys, this is bypassed.
// ============================================================================
import { PRICING } from './pricing.js'
import { computeCommission } from './commission.js'

const LS_KEY = 'dab_mock_db_v1'

// ---- seed roster -----------------------------------------------------------
// Owners: Dylan, Artem, Barak (Barak also = Manager). Then a couple teams.
function seed() {
  const teamA = 'team-a'
  const teamB = 'team-b'

  const users = [
    { id: 'u-dylan', name: 'Dylan', email: 'dylan@dab.com', role: 'owner', team_id: null, reports_to_id: null, commission_rate: 0, override_rate: 0, active: true },
    { id: 'u-artem', name: 'Artem', email: 'artem@dab.com', role: 'owner', team_id: null, reports_to_id: null, commission_rate: 0, override_rate: 0, active: true },
    { id: 'u-barak', name: 'Barak', email: 'barak@dab.com', role: 'manager', team_id: null, reports_to_id: null, commission_rate: 0, override_rate: 0, active: true },
    { id: 'u-dom', name: 'Dom', email: 'dom@dab.com', role: 'sub_manager', team_id: teamA, reports_to_id: 'u-barak', commission_rate: 0.12, override_rate: 0.02, active: true },
    { id: 'u-jake', name: 'Jake', email: 'jake@dab.com', role: 'sub_manager', team_id: teamB, reports_to_id: 'u-barak', commission_rate: 0.12, override_rate: 0.02, active: true },
    { id: 'u-mike', name: 'Mike', email: 'mike@dab.com', role: 'rep', team_id: teamA, reports_to_id: 'u-dom', commission_rate: 0.10, override_rate: 0, active: true },
    { id: 'u-sara', name: 'Sara', email: 'sara@dab.com', role: 'rep', team_id: teamA, reports_to_id: 'u-dom', commission_rate: 0.10, override_rate: 0, active: true },
    { id: 'u-leo', name: 'Leo', email: 'leo@dab.com', role: 'rep', team_id: teamB, reports_to_id: 'u-jake', commission_rate: 0.10, override_rate: 0, active: true },
    { id: 'u-nina', name: 'Nina', email: 'nina@dab.com', role: 'rep', team_id: teamB, reports_to_id: 'u-jake', commission_rate: 0.10, override_rate: 0, active: true },
  ]

  const teams = [
    { id: teamA, name: "Dom's Team", sub_manager_id: 'u-dom' },
    { id: teamB, name: "Jake's Team", sub_manager_id: 'u-jake' },
  ]

  // a few seed deals this week to make dashboards + leaderboard feel alive
  const now = Date.now()
  const day = 86400000
  const raw = [
    { rep: 'u-mike', price: 300, svc: 'House Wash', name: 'R. Alvarez', addr: '102 Maple St', ago: 0 },
    { rep: 'u-mike', price: 219, svc: 'Driveway', name: 'T. Brooks', addr: '118 Maple St', ago: 1 },
    { rep: 'u-sara', price: 409, svc: 'House Wash', name: 'K. Patel', addr: '54 Oak Ave', ago: 0 },
    { rep: 'u-sara', price: 164, svc: 'Patio', name: 'D. Nguyen', addr: '60 Oak Ave', ago: 2 },
    { rep: 'u-dom', price: 499, svc: 'House Wash', name: 'M. Russo', addr: '9 Birch Ln', ago: 1 },
    { rep: 'u-leo', price: 289, svc: 'Driveway', name: 'B. Coleman', addr: '301 Pine Rd', ago: 0 },
    { rep: 'u-nina', price: 269, svc: 'House Wash', name: 'S. Park', addr: '77 Cedar Ct', ago: 1 },
    { rep: 'u-leo', price: 114, svc: 'Patio', name: 'A. Flynn', addr: '315 Pine Rd', ago: 3 },
  ]
  const byId = Object.fromEntries(users.map((u) => [u.id, u]))
  const deals = raw.map((r, i) => {
    const closer = byId[r.rep]
    const leader = users.find((u) => u.role === 'sub_manager' && u.team_id === closer.team_id) || null
    const comm = computeCommission({ totalPrice: r.price, closer, leader })
    return {
      id: 'd-' + i,
      rep_id: r.rep,
      team_id: closer.team_id,
      services: [{ type: r.svc, tier: '', qty: 1, line_price: r.price }],
      customer_name: r.name,
      address: r.addr,
      phone: '',
      total_price: r.price,
      payment_status: 'paid',
      photo_url: null,
      notes: '',
      status: 'approved',
      ghl_synced: true,
      closed_at: new Date(now - r.ago * day).toISOString(),
      ...comm,
    }
  })

  const channels = [
    { id: 'c-wins', slug: 'wins', name: '#wins', sort_order: 1 },
    { id: 'c-general', slug: 'general', name: '#general', sort_order: 2 },
    { id: 'c-losses', slug: 'losses-learnings', name: '#losses-learnings', sort_order: 3 },
  ]
  const messages = deals
    .slice(0, 5)
    .map((d, i) => ({
      id: 'm-' + i,
      channel_id: 'c-wins',
      author_id: d.rep_id,
      body: `Closed ${d.customer_name} — $${d.total_price}`,
      deal_id: d.id,
      created_at: d.closed_at,
    }))

  const territories = [
    { id: 't-1', neighborhood: 'Maple Heights', street: 'Maple St', assigned_team_id: teamA, assigned_rep_id: 'u-mike', work_date: new Date().toISOString().slice(0, 10) },
    { id: 't-2', neighborhood: 'Maple Heights', street: 'Oak Ave', assigned_team_id: teamA, assigned_rep_id: 'u-sara', work_date: new Date().toISOString().slice(0, 10) },
  ]

  return { users, teams, deals, pricing: PRICING.map((p, i) => ({ id: 'p-' + i, ...p, active: true })), channels, messages, territories }
}

export function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  const db = seed()
  saveDB(db)
  return db
}

export function saveDB(db) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch (e) { /* ignore */ }
}

export function resetDB() {
  localStorage.removeItem(LS_KEY)
  return loadDB()
}
