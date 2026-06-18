// lib/supabase.ts — shared Supabase clients
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC  = process.env.SUPABASE_SERVICE_KEY!

// Browser client (React components)
export const supabaseBrowser = () => createBrowserClient(URL, ANON)

// Server component client (reads cookies)
export const supabaseServer = () => {
  const cookieStore = cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      get:    (n: string)                        => cookieStore.get(n)?.value,
      set:    (n: string, v: string, o: object)  => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
      remove: (n: string, o: object)             => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
    },
  })
}

// Service role client (API routes / scraper — bypasses RLS)
export const supabaseAdmin = () => createClient(URL, SVC, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Types ────────────────────────────────────────────────────────
export type Store = {
  id: string; slug: string; name: string; chain: string | null
  store_type: string; city: string; zip_code: string
  delivery_fee: number; min_order: number; logo_url: string | null
  is_active: boolean; is_scraped: boolean; distance_km?: number
  opening_hours: Record<string, string> | null
}

export type Product = {
  id: string; store_id: string; name: string; brand: string | null
  price: number; price_original: number | null; category: string
  unit: string | null; image_url: string | null; ean_barcode: string | null
  in_stock: boolean; is_organic: boolean; description: string | null
}

export type Order = {
  id: string; customer_id: string; store_id: string; shopper_id: string | null
  status: 'pending'|'confirmed'|'shopping'|'in_transit'|'delivered'|'cancelled'
  delivery_address: { street: string; city: string; zip: string; lat: number; lng: number; notes?: string }
  subtotal: number; delivery_fee: number; service_fee: number
  tip_amount: number; total: number; payment_method: string | null
  placed_at: string; delivered_at: string | null
}

export type CartItem = { product: Product; quantity: number }
