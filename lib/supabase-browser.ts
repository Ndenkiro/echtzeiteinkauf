// lib/supabase-browser.ts — client-side only (no next/headers)
import { createBrowserClient } from '@supabase/ssr'

export const supabaseBrowser = () => createBrowserClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
// Types
export type { Store, Product, Order, CartItem } from './supabase'
