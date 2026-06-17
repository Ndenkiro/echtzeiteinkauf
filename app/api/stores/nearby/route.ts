// app/api/stores/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '0')
  const lng = parseFloat(searchParams.get('lng') ?? '0')
  const km  = parseFloat(searchParams.get('km') ?? '10')

  if (!lat || !lng) {
    // Fallback: return all active stores (no geo filter)
    const { data } = await supabaseAdmin()
      .from('stores').select('*').eq('is_active', true).order('name')
    return NextResponse.json({ stores: data })
  }

  const { data, error } = await supabaseAdmin()
    .rpc('nearby_stores', { user_lat: lat, user_lng: lng, radius_km: km })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { stores: data },
    { headers: { 'Cache-Control': 'public, s-maxage=60' } }
  )
}
