// lib/supabase-browser.ts — client-side only (no next/headers)
import { createBrowserClient } from '@supabase/ssr'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseBrowser = () => createBrowserClient(URL, ANON)

// Types
export type { Store, Product, Order, CartItem } from './supabase'
