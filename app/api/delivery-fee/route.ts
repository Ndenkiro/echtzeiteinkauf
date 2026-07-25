// app/api/delivery-fee/route.ts
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function isPeakHour(hour: number) {
  return (hour >= 7 && hour <= 8) || (hour >= 16 && hour <= 18)
}

export async function POST(request: Request) {
  try {
    const { storeLat, storeLng, customerLat, customerLng, itemCount } = await request.json()

    if (!storeLat || !storeLng || !customerLat || !customerLng) {
      return NextResponse.json({ error: 'Koordinaten fehlen' }, { status: 400 })
    }

    const distanceKm = haversine(storeLat, storeLng, customerLat, customerLng)
    const hour = new Date().getHours()
    const peakHour = isPeakHour(hour)

    // Fee calculation
    const baseFee = 1.99 + (distanceKm * 0.35) + ((itemCount || 1) * 0.10)
    const peakSurcharge = peakHour ? baseFee * 0.30 : 0
    const totalFee = baseFee + peakSurcharge
    const estimatedWeight = Math.max((itemCount || 1) * 0.5, 1)

    return NextResponse.json({
      distanceKm: Math.round(distanceKm * 10) / 10,
      baseFee: Math.round(baseFee * 100) / 100,
      peakSurcharge: Math.round(peakSurcharge * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
      isPeakHour: peakHour,
      estimatedWeightKg: Math.round(estimatedWeight * 10) / 10,
      peakMessage: peakHour ? 'Stoßzeit (7–9h / 16–19h): +30% Zuschlag' : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
