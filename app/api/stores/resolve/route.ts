// app/api/stores/resolve/route.ts
// Turns a Google Places result into a real store in our catalogue.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function env(name: string): string {
  const e = process.env as Record<string, string | undefined>
  return e[name] ?? ''
}
const SERVICE_KEY = env(['SUPABASE', 'SERVICE', 'KEY'].join('_'))
const MAPS_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/** Known chains, so "EDEKA Müller" resolves to the "Edeka" catalogue */
const CHAINS = [
  'Lidl', 'Aldi', 'Rewe', 'Edeka', 'Penny', 'Kaufland', 'Netto', 'Norma',
  'Tegut', 'Globus', 'Denns', 'Alnatura', 'Real', 'Marktkauf',
  'dm', 'Rossmann', 'Müller', 'Budni',
  'H&M', 'C&A', 'Zara', 'Primark', 'Takko', 'KiK', 'Deichmann', 'Esprit',
  'MediaMarkt', 'Saturn', 'Expert', 'Conrad', 'Cyberport',
]

function detectChain(name: string): string | null {
  const n = name.toLowerCase().replace(/\s+/g, ' ')
  // Longest match first: "Aldi Süd" before "Aldi"
  const sorted = [...CHAINS].sort((a, b) => b.length - a.length)
  for (const c of sorted) {
    if (n.includes(c.toLowerCase())) return c
  }
  return null
}

const CATEGORY_BY_CHAIN: Record<string, string> = {
  dm: 'drugstore', rossmann: 'drugstore', müller: 'drugstore', budni: 'drugstore',
  'h&m': 'textile', 'c&a': 'textile', zara: 'textile', primark: 'textile',
  takko: 'textile', kik: 'textile', deichmann: 'textile', esprit: 'textile',
  mediamarkt: 'electronics', saturn: 'electronics', expert: 'electronics',
  conrad: 'electronics', cyberport: 'electronics',
}

/** Ask Google for the full address of a place */
async function fetchPlaceDetails(placeId: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json`
      + `?place_id=${encodeURIComponent(placeId)}`
      + `&fields=name,formatted_address,address_component,geometry`
      + `&language=de&key=${MAPS_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    if (data.status !== 'OK') return null

    const r = data.result
    const get = (t: string) =>
      r.address_components?.find((c: any) => c.types.includes(t))?.long_name || null

    return {
      name: r.name,
      address: r.formatted_address?.replace(/,\s*(Deutschland|Germany)\s*$/i, '') || null,
      city: get('locality') || get('administrative_area_level_2') || get('administrative_area_level_1'),
      postal: get('postal_code'),
      lat: r.geometry?.location?.lat ?? null,
      lng: r.geometry?.location?.lng ?? null,
    }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { placeId, name, address, lat, lng, category } = body

    if (!placeId || !name) {
      return NextResponse.json({ error: 'placeId und name erforderlich' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Known already? Skip the Places call entirely.
    const { data: existing } = await supabase
      .from('stores')
      .select('slug, id')
      .eq('google_place_id', placeId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: true, created: false, slug: existing.slug })
    }

    // Enrich with the real address
    const details = await fetchPlaceDetails(placeId)
    const chain = detectChain(name)
    const cat = category
      || (chain ? CATEGORY_BY_CHAIN[chain.toLowerCase()] : null)
      || 'food'

    const { data, error } = await supabase.rpc('resolve_store', {
      p_place_id: placeId,
      p_name:     details?.name || name,
      p_address:  details?.address || address || null,
      p_city:     details?.city || null,
      p_postal:   details?.postal || null,
      p_lat:      details?.lat ?? lat ?? null,
      p_lng:      details?.lng ?? lng ?? null,
      p_chain:    chain,
      p_category: cat,
    })

    if (error) throw error
    if (!data?.ok) {
      return NextResponse.json({ error: data?.reason || 'unbekannt' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[resolve-store]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
