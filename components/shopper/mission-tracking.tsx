'use client'
// components/shopper/mission-tracking.tsx — map + 4h countdown
import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Navigation, Clock, AlertTriangle, MapPin, Route } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU4Z'

// ── 4h countdown ───────────────────────────────────────────────
export function MissionCountdown({ assignedAt }: { assignedAt: string | null }) {
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!assignedAt) return
    const deadline = new Date(assignedAt).getTime() + 4 * 60 * 60 * 1000
    const tick = () => setLeft(Math.max(0, deadline - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [assignedAt])

  if (left === null) return null

  const h = Math.floor(left / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  const s = Math.floor((left % 60000) / 1000)

  const urgent = left < 30 * 60 * 1000
  const warn = left < 60 * 60 * 1000

  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-3 ${
      urgent ? 'bg-red-500/15 text-red-400'
      : warn ? 'bg-orange/15 text-orange'
      : 'bg-white/[0.06] text-white/60'
    }`}>
      {urgent ? <AlertTriangle size={15} className="flex-shrink-0" />
              : <Clock size={15} className="flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black">
          {left === 0
            ? 'Zeit abgelaufen'
            : `Noch ${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`}
        </div>
        <div className="text-[10px] opacity-70">
          {left === 0
            ? 'Der Auftrag wird freigegeben'
            : 'Bis zur automatischen Freigabe'}
        </div>
      </div>
    </div>
  )
}

// ── Live route map ─────────────────────────────────────────────
export function MissionMap({ order }: { order: any }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const meMarker = useRef<any>(null)
  const pathLine = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>([])
  const [distance, setDistance] = useState(0)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  const dest = order.delivery_address

  useEffect(() => {
    if ((window as any).google?.maps) { setReady(true); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&language=de`
    s.async = true
    s.onload = () => setReady(true)
    document.head.appendChild(s)
  }, [])

  // Load the trail
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc('get_mission_track', { p_order_id: order.id })
      if (data?.length) {
        const pts = data.map((p: any) => ({ lat: p.lat, lng: p.lng }))
        setPoints(pts)
        // Total distance covered
        let d = 0
        for (let i = 1; i < pts.length; i++) {
          const R = 6371
          const dLat = (pts[i].lat - pts[i-1].lat) * Math.PI / 180
          const dLng = (pts[i].lng - pts[i-1].lng) * Math.PI / 180
          const a = Math.sin(dLat/2)**2 +
            Math.cos(pts[i-1].lat*Math.PI/180) * Math.cos(pts[i].lat*Math.PI/180) * Math.sin(dLng/2)**2
          d += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        }
        setDistance(Math.round(d * 10) / 10)
      }
    }
    load()

    const ch = supabase.channel(`track-${order.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_tracking', filter: `order_id=eq.${order.id}` },
        (p: any) => setPoints(prev => [...prev, { lat: p.new.lat, lng: p.new.lng }]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [order.id])

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return
    const g = (window as any).google
    const center = dest?.lat ? { lat: dest.lat, lng: dest.lng } : { lat: 49.4521, lng: 11.0767 }

    const map = new g.maps.Map(mapRef.current, {
      center, zoom: 13, disableDefaultUI: true, zoomControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#212121' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
        { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapInstance.current = map

    if (dest?.lat) {
      new g.maps.Marker({
        position: { lat: dest.lat, lng: dest.lng }, map,
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 11, fillColor: '#E30B6D',
                fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        title: 'Lieferadresse',
      })
    }
  }, [ready, dest])

  // Draw the trail + current position
  useEffect(() => {
    if (!mapInstance.current || !ready || points.length === 0) return
    const g = (window as any).google
    const last = points[points.length - 1]

    if (pathLine.current) pathLine.current.setMap(null)
    if (points.length > 1) {
      pathLine.current = new g.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: '#F7A800',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: mapInstance.current,
      })
    }

    if (meMarker.current) {
      meMarker.current.setPosition(last)
    } else {
      meMarker.current = new g.maps.Marker({
        position: last, map: mapInstance.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
              <circle cx="19" cy="19" r="16" fill="#F7A800" stroke="white" stroke-width="3"/>
              <text x="19" y="26" text-anchor="middle" font-size="17">🚴</text>
            </svg>`),
          scaledSize: new g.maps.Size(38, 38),
          anchor: new g.maps.Point(19, 19),
        },
        title: 'Ihre Position',
      })
    }
    mapInstance.current.panTo(last)
  }, [points, ready])

  const isTransit = order.status === 'in_transit'

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 mb-4">
      <div className="relative">
        <div ref={mapRef} className="w-full h-52 bg-[#212121]" />
        {isTransit && points.length > 0 && (
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2">
            <Navigation size={13} className="text-green-400 animate-pulse" />
            <span className="text-[11px] font-black text-white">GPS aktiv</span>
          </div>
        )}
        {!isTransit && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center px-6">
              <MapPin size={22} className="text-white/40 mx-auto mb-2" />
              <p className="text-xs text-white/60 font-bold">
                GPS startet, sobald Sie losfahren
              </p>
            </div>
          </div>
        )}
      </div>

      {points.length > 0 && (
        <div className="bg-white/[0.03] px-4 py-2.5 flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-white/50">
            <Route size={12} /> {distance} km zurückgelegt
          </span>
          <span className="flex items-center gap-1.5 text-white/50">
            <MapPin size={12} /> {points.length} Punkte
          </span>
        </div>
      )}
    </div>
  )
}
