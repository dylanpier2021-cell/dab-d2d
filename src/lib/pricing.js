// Pricing data — mirrors the seed in supabase/schema.sql.
// Used as the in-app fallback when running in mock mode (no backend yet).

export const PRICING = [
  { service: 'House Wash', tier: 'Small 1-story (1,000-1,500 sqft)', size_min: 1000, size_max: 1500, price: 269, unit: 'flat' },
  { service: 'House Wash', tier: 'Large 1-story (1,500-2,000 sqft)', size_min: 1500, size_max: 2000, price: 334, unit: 'flat' },
  { service: 'House Wash', tier: 'Small 2-story (2,000-2,800 sqft)', size_min: 2000, size_max: 2800, price: 409, unit: 'flat' },
  { service: 'House Wash', tier: 'Large 2-story (2,800-3,500+ sqft)', size_min: 2800, size_max: 3500, price: 499, unit: 'flat' },
  { service: 'Driveway', tier: '1-car (300-500 sqft)', size_min: 300, size_max: 500, price: 179, unit: 'flat' },
  { service: 'Driveway', tier: '2-car (500-800 sqft)', size_min: 500, size_max: 800, price: 219, unit: 'flat' },
  { service: 'Driveway', tier: '3-car (800-1,200 sqft)', size_min: 800, size_max: 1200, price: 289, unit: 'flat' },
  { service: 'Driveway', tier: 'XL / long (1,200-2,000+ sqft)', size_min: 1200, size_max: 2000, price: 0.39, unit: 'per_sqft' },
  { service: 'Patio', tier: 'Small (100-200 sqft)', size_min: 100, size_max: 200, price: 114, unit: 'flat' },
  { service: 'Patio', tier: 'Medium (200-400 sqft)', size_min: 200, size_max: 400, price: 164, unit: 'flat' },
  { service: 'Patio', tier: 'Large (400-700 sqft)', size_min: 400, size_max: 700, price: 224, unit: 'flat' },
  { service: 'Patio', tier: 'XL (700+ sqft)', size_min: 700, size_max: 2000, price: 0.35, unit: 'per_sqft' },
  { service: 'Windows', tier: 'Small / 2-panel', size_min: null, size_max: null, price: 5, unit: 'per_window' },
  { service: 'Windows', tier: 'Medium / 4-panel', size_min: null, size_max: null, price: 7, unit: 'per_window' },
  { service: 'Windows', tier: 'Large / bay or slider', size_min: null, size_max: null, price: 10, unit: 'per_window' },
]

export const PRICE_FLOORS = { 'House Wash': 249, Driveway: 179, Patio: 99, Windows: 49 }

export const SERVICES = ['House Wash', 'Driveway', 'Patio', 'Windows']

// price one line item given a tier + quantity (sqft or window count)
export function linePrice(item) {
  if (!item) return 0
  if (item.unit === 'flat') return Number(item.price) || 0
  const qty = Number(item.qty) || 0
  return Math.round((Number(item.price) || 0) * qty)
}
