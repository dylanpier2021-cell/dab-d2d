// ============================================================================
// Data API — one interface the UI calls, backed by EITHER Supabase or the
// in-memory mock DB depending on whether keys are configured.
// ============================================================================
import { HAS_BACKEND, supabase } from './supabase.js'
import { loadDB, saveDB } from './mockData.js'
import { computeCommission } from './commission.js'

const uid = () => 'id-' + Math.random().toString(36).slice(2, 10)

export async function getUsers() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('users').select('*').order('name')
    return data || []
  }
  return loadDB().users
}

export async function getTeams() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('teams').select('*').order('name')
    return data || []
  }
  return loadDB().teams
}

export async function saveUser(user) {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('users').upsert(user).select().single()
    return data
  }
  const db = loadDB()
  const i = db.users.findIndex((u) => u.id === user.id)
  if (i >= 0) db.users[i] = { ...db.users[i], ...user }
  else db.users.push({ id: uid(), active: true, ...user })
  saveDB(db)
  return user
}

export async function createTeam(team) {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('teams').insert(team).select().single()
    return data
  }
  const db = loadDB()
  const t = { id: uid(), ...team }
  db.teams.push(t)
  saveDB(db)
  return t
}

export async function getDeals() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('deals').select('*').order('closed_at', { ascending: false })
    return data || []
  }
  return [...loadDB().deals].sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at))
}

// Submit a closed job. The override always follows the TEAM'S LEADER
// (teams.sub_manager_id) — works whether that leader's role is sub_manager OR
// manager (so Barak, a manager who also runs a team, still earns his override).
export async function submitDeal({ closer, allUsers, deal }) {
  const teams = await getTeams()
  const team = teams.find((t) => t.id === closer.team_id)
  let leader = null
  if (team?.sub_manager_id) leader = allUsers.find((u) => u.id === team.sub_manager_id) || null
  if (!leader) leader = allUsers.find((u) => u.role === 'sub_manager' && u.team_id === closer.team_id) || null

  const comm = computeCommission({ totalPrice: deal.total_price, closer, leader })

  const record = {
    rep_id: closer.id,
    team_id: closer.team_id,
    services: deal.services || [],
    customer_name: deal.customer_name || '',
    address: deal.address || '',
    phone: deal.phone || '',
    total_price: Number(deal.total_price) || 0,
    payment_status: deal.payment_status || 'paid',
    photo_url: deal.photo_url || null,
    notes: deal.notes || '',
    status: 'submitted',
    ghl_synced: false,
    closed_at: new Date().toISOString(),
    ...comm,
  }

  if (HAS_BACKEND) {
    const { data } = await supabase.from('deals').insert(record).select().single()
    await postWin(closer, data)
    fireGhlWebhook(record, closer)
    return data
  }

  const db = loadDB()
  const full = { id: uid(), ...record }
  db.deals.unshift(full)
  db.messages.unshift({
    id: uid(),
    channel_id: db.channels.find((c) => c.slug === 'wins')?.id,
    author_id: closer.id,
    body: `Closed ${record.customer_name || 'a job'} — $${record.total_price}`,
    deal_id: full.id,
    created_at: full.closed_at,
  })
  saveDB(db)
  fireGhlWebhook(record, closer)
  return full
}

async function postWin(author, deal) {
  const { data: ch } = await supabase.from('chat_channels').select('id').eq('slug', 'wins').single()
  if (ch) {
    await supabase.from('chat_messages').insert({
      channel_id: ch.id,
      author_id: author.id,
      body: `Closed ${deal.customer_name || 'a job'} — $${deal.total_price}`,
      deal_id: deal.id,
    })
  }
}

function servicesSummary(services = []) {
  return services
    .map((s) => `${s.type}${s.tier ? ` (${s.tier})` : ''}${s.qty > 1 ? ` x${s.qty}` : ''} — $${s.line_price}`)
    .join(', ')
}

function fireGhlWebhook(record, closer) {
  const url = import.meta.env.VITE_GHL_WEBHOOK_URL
  if (!url) return
  const payload = {
    rep_name: closer?.name || '',
    rep_email: closer?.email || '',
    customer_name: record.customer_name,
    address: record.address,
    phone: record.phone,
    services_summary: servicesSummary(record.services),
    total_price: record.total_price,
    payment_status: record.payment_status,
    notes: record.notes,
    closed_at: record.closed_at,
    services: record.services,
  }
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch (e) { /* ignore */ }
}

export async function getPricing() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('pricing').select('*').eq('active', true).order('sort_order')
    return data || []
  }
  return loadDB().pricing
}

export async function getChannels() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('chat_channels').select('*').order('sort_order')
    return data || []
  }
  return loadDB().channels
}

export async function getMessages(channelId) {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('chat_messages').select('*').eq('channel_id', channelId).order('created_at')
    return data || []
  }
  return loadDB().messages.filter((m) => m.channel_id === channelId)
}

export async function sendMessage({ channelId, authorId, body }) {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('chat_messages').insert({ channel_id: channelId, author_id: authorId, body }).select().single()
    return data
  }
  const db = loadDB()
  const m = { id: uid(), channel_id: channelId, author_id: authorId, body, deal_id: null, created_at: new Date().toISOString() }
  db.messages.push(m)
  saveDB(db)
  return m
}

export function subscribeMessages(channelId, cb) {
  if (!HAS_BACKEND) return () => {}
  const ch = supabase
    .channel(`messages:${channelId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
      (payload) => cb(payload.new))
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// ---------------------------------------------------------------------------
// TERRITORY / KNOCKS / ASSIGNMENT
// ---------------------------------------------------------------------------
export async function getTerritories() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('territories').select('*')
    return data || []
  }
  return loadDB().territories
}

// Managers assign a street to a team; team leaders assign it to a specific rep.
export async function createTerritory({ neighborhood, street, assigned_team_id, assigned_rep_id, work_date }) {
  const row = { neighborhood, street, assigned_team_id: assigned_team_id || null, assigned_rep_id: assigned_rep_id || null, work_date: work_date || new Date().toISOString().slice(0, 10) }
  if (HAS_BACKEND) {
    const { data } = await supabase.from('territories').insert(row).select().single()
    return data
  }
  const db = loadDB()
  const t = { id: uid(), ...row }
  db.territories.push(t)
  saveDB(db)
  return t
}

export async function assignTerritory(id, assigned_rep_id) {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('territories').update({ assigned_rep_id }).eq('id', id).select().single()
    return data
  }
  const db = loadDB()
  const t = db.territories.find((x) => x.id === id)
  if (t) { t.assigned_rep_id = assigned_rep_id; saveDB(db) }
  return t
}

export async function deleteTerritory(id) {
  if (HAS_BACKEND) { await supabase.from('territories').delete().eq('id', id); return }
  const db = loadDB()
  db.territories = db.territories.filter((x) => x.id !== id)
  saveDB(db)
}

export async function getKnocks() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('knock_logs').select('*')
    return data || []
  }
  try { return JSON.parse(localStorage.getItem('dab_knocks_v1')) || [] } catch { return [] }
}

export async function saveKnock({ address, status, rep_id, territory_id, lat, lng }) {
  if (HAS_BACKEND) {
    const { data } = await supabase
      .from('knock_logs')
      .upsert({ address, status, rep_id, territory_id, lat, lng, updated_at: new Date().toISOString() }, { onConflict: 'address' })
      .select().single()
    return data
  }
  return { address, status, rep_id, territory_id, lat, lng, updated_at: new Date().toISOString() }
}

export function subscribeKnocks(cb) {
  if (!HAS_BACKEND) return () => {}
  const ch = supabase
    .channel('knocks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'knock_logs' }, (payload) => cb(payload.new))
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// ---------------------------------------------------------------------------
// SHIFTS  (managers post a shift; everyone taps going / not going)
// ---------------------------------------------------------------------------
export async function getShifts() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('shifts').select('*').order('shift_date')
    return data || []
  }
  return loadDB().shifts || []
}

export async function createShift({ label, shift_date, start_time, end_time, team_id, created_by }) {
  const row = { label: label || '', shift_date, start_time: start_time || '', end_time: end_time || '', team_id: team_id || null, created_by: created_by || null }
  if (HAS_BACKEND) {
    const { data } = await supabase.from('shifts').insert(row).select().single()
    return data
  }
  const db = loadDB()
  db.shifts = db.shifts || []
  const s = { id: uid(), ...row }
  db.shifts.push(s)
  saveDB(db)
  return s
}

export async function deleteShift(id) {
  if (HAS_BACKEND) { await supabase.from('shifts').delete().eq('id', id); return }
  const db = loadDB()
  db.shifts = (db.shifts || []).filter((s) => s.id !== id)
  db.rsvps = (db.rsvps || []).filter((r) => r.shift_id !== id)
  saveDB(db)
}

export async function getRsvps() {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('shift_rsvps').select('*')
    return data || []
  }
  return loadDB().rsvps || []
}

export async function setRsvp({ shift_id, user_id, status }) {
  if (HAS_BACKEND) {
    const { data } = await supabase
      .from('shift_rsvps')
      .upsert({ shift_id, user_id, status, updated_at: new Date().toISOString() }, { onConflict: 'shift_id,user_id' })
      .select().single()
    return data
  }
  const db = loadDB()
  db.rsvps = db.rsvps || []
  const ex = db.rsvps.find((r) => r.shift_id === shift_id && r.user_id === user_id)
  if (ex) ex.status = status
  else db.rsvps.push({ id: uid(), shift_id, user_id, status })
  saveDB(db)
  return { shift_id, user_id, status }
}

export function subscribeShifts(cb) {
  if (!HAS_BACKEND) return () => {}
  const ch = supabase
    .channel('shifts-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_rsvps' }, () => cb())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => cb())
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// Generic patch for a territory (assign rep, set houses, etc.)
export async function updateTerritory(id, patch) {
  if (HAS_BACKEND) {
    const { data } = await supabase.from('territories').update(patch).eq('id', id).select().single()
    return data
  }
  const db = loadDB()
  const t = db.territories.find((x) => x.id === id)
  if (t) { Object.assign(t, patch); saveDB(db) }
  return t
}
