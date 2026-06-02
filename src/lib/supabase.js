// Detects whether real Supabase keys are present.
// If not, the app runs in MOCK MODE (see lib/api.js + lib/mockData.js).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const HAS_BACKEND = Boolean(url && key)

export const supabase = HAS_BACKEND ? createClient(url, key) : null
