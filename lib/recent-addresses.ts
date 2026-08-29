// lib/recent-addresses.ts — localStorage first, Supabase when signed in
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const KEY = 'echtzeiteinkauf-recent-addresses'
const MAX = 6

export type RecentAddress = {
  label: string      // "Nürnberger Str. 134"
  subLabel?: string  // "90762 Fürth"
  fullText: string   // what we geocode
  lat?: number
  lng?: number
  lastUsed: number   // epoch ms
}

// Shown before the user has any history
export const DEFAULT_SUGGESTIONS: RecentAddress[] = [
  { label: 'Nürnberger Str. 134', subLabel: '90762 Fürth',    fullText: 'Nürnberger Str. 134, 90762 Fürth',    lastUsed: 0 },
  { label: 'Königstraße 10',      subLabel: '90402 Nürnberg', fullText: 'Königstraße 10, 90402 Nürnberg',      lastUsed: 0 },
  { label: 'Hauptmarkt 1',        subLabel: '90402 Nürnberg', fullText: 'Hauptmarkt 1, 90402 Nürnberg',        lastUsed: 0 },
]

const supabase = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

// ── localStorage ───────────────────────────────────────────────
function readLocal(): RecentAddress[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeLocal(list: RecentAddress[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {}
}

// ── Split a formatted address into label + sub-label ───────────
export function splitAddress(text: string): { label: string; subLabel?: string } {
  const clean = text.replace(/,\s*(Deutschland|Germany)\s*$/i, '').trim()
  const parts = clean.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return { label: text }
  if (parts.length === 1) return { label: parts[0] }
  // Street first, then postcode + city
  return { label: parts[0], subLabel: parts.slice(1).join(', ') }
}

// ── Save an address after it has been used ─────────────────────
export async function saveRecentAddress(
  fullText: string,
  coords?: { lat: number; lng: number }
) {
  const { label, subLabel } = splitAddress(fullText)
  const entry: RecentAddress = {
    label,
    subLabel,
    fullText: fullText.trim(),
    lat: coords?.lat,
    lng: coords?.lng,
    lastUsed: Date.now(),
  }

  // Local: move to front, no duplicates
  const local = readLocal().filter(
    a => a.fullText.toLowerCase() !== entry.fullText.toLowerCase()
  )
  writeLocal([entry, ...local])

  // Remote: only when signed in
  try {
    const sb = supabase()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.rpc('save_recent_address', {
      p_label:     entry.label,
      p_sub_label: entry.subLabel ?? null,
      p_full_text: entry.fullText,
      p_lat:       entry.lat ?? null,
      p_lng:       entry.lng ?? null,
    })
  } catch {}
}

// ── Read, merging both sources ─────────────────────────────────
export async function getRecentAddresses(limit = 3): Promise<{
  addresses: RecentAddress[]
  isHistory: boolean
}> {
  const local = readLocal()
  let remote: RecentAddress[] = []

  try {
    const sb = supabase()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const { data } = await sb.rpc('get_recent_addresses', { p_limit: MAX })
      remote = (data || []).map((r: any) => ({
        label: r.label,
        subLabel: r.sub_label ?? undefined,
        fullText: r.full_text,
        lat: r.lat ?? undefined,
        lng: r.lng ?? undefined,
        lastUsed: new Date(r.last_used).getTime(),
      }))
    }
  } catch {}

  // Merge, keeping the most recent occurrence of each address
  const map = new Map<string, RecentAddress>()
  for (const a of [...remote, ...local]) {
    const key = a.fullText.toLowerCase()
    const existing = map.get(key)
    if (!existing || a.lastUsed > existing.lastUsed) map.set(key, a)
  }

  const merged = Array.from(map.values()).sort((a, b) => b.lastUsed - a.lastUsed)

  // Keep local in sync with what the account knows
  if (remote.length > 0) writeLocal(merged)

  if (merged.length === 0) {
    return { addresses: DEFAULT_SUGGESTIONS.slice(0, limit), isHistory: false }
  }
  return { addresses: merged.slice(0, limit), isHistory: true }
}

// ── Remove one ─────────────────────────────────────────────────
export async function removeRecentAddress(fullText: string) {
  writeLocal(readLocal().filter(
    a => a.fullText.toLowerCase() !== fullText.toLowerCase()
  ))
  try {
    const sb = supabase()
    const { data: { user } } = await sb.auth.getUser()
    if (user) await sb.rpc('delete_recent_address', { p_full_text: fullText })
  } catch {}
}
