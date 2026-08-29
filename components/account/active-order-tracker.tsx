'use client'
// components/account/active-order-tracker.tsx — live order card on /konto
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  Clock, ShoppingCart, Truck, Package, CheckCircle2,
  MapPin, MessageCircle, ChevronRight, Star, UserSearch,
  AlertTriangle, Navigation
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

const STEPS = [
  { key: 'pending',    label: 'Bestellt',     icon: Clock },
  { key: 'confirmed',  label: 'Zugewiesen',   icon: CheckCircle2 },
  { key: 'shopping',   label: 'Einkauf',      icon: ShoppingCart },
  { key: 'in_transit', label: 'Unterwegs',    icon: Truck },
  { key: 'delivered',  label: 'Geliefert',    icon: Package },
]
const IDX: Record<string, number> = {
  pending: 0, confirmed: 1, shopping: 2, in_transit: 3, delivered: 4,
}

export function ActiveOrderTracker() {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const marker = useRef<any>(null)
  const [mapsReady, setMapsReady] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data } = await supabase.rpc('get_my_active_order')
    setOrder(data?.[0] ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Realtime: order changes + GPS points
  useEffect(() => {
    if (!order?.order_id) return
    const ch = supabase.channel(`konto-track-${order.order_id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.order_id}` },
        () => load())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_tracking', filter: `order_id=eq.${order.order_id}` },
        (p: any) => setOrder((o: any) => o ? { ...o, shopper_lat: p.new.lat, shopper_lng: p.new.lng } : o))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [order?.order_id])

  // Refresh while waiting for a shopper
  useEffect(() => {
    if (order?.status !== 'pending') return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [order?.status])

  // Load maps only when a position exists
  useEffect(() => {
    if (!order?.shopper_lat) return
    if ((window as any).google?.maps) { setMapsReady(true); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&language=de`
    s.async = true
    s.onload = () => setMapsReady(true)
    document.head.appendChild(s)
  }, [order?.shopper_lat])

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !order?.shopper_lat) return
    const g = (window as any).google

    if (!mapInstance.current) {
      mapInstance.current = new g.maps.Map(mapRef.current, {
        center: { lat: order.shopper_lat, lng: order.shopper_lng },
        zoom: 14, disableDefaultUI: true,
      })
      if (order.dest_lat) {
        new g.maps.Marker({
          position: { lat: order.dest_lat, lng: order.dest_lng },
          map: mapInstance.current,
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#E30B6D',
                  fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        })
      }
    }

    const pos = { lat: order.shopper_lat, lng: order.shopper_lng }
    if (marker.current) {
      marker.current.setPosition(pos)
    } else {
      marker.current = new g.maps.Marker({
        position: pos, map: mapInstance.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r="14" fill="#F7A800" stroke="white" stroke-width="3"/>
              <text x="17" y="23" text-anchor="middle" font-size="15">🚴</text>
            </svg>`),
          scaledSize: new g.maps.Size(34, 34),
          anchor: new g.maps.Point(17, 17),
        },
      })
    }
    mapInstance.current.panTo(pos)
  }, [mapsReady, order?.shopper_lat, order?.shopper_lng])

  if (loading || !order) return null

  const step = IDX[order.status] ?? 0
  const hoursLeft = Number(order.hours_left)
  const urgent = hoursLeft < 1
  const warn = hoursLeft < 2

  return (
    <div className="bg-white rounded-2xl border-2 border-red/25 overflow-hidden mb-8">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
        <div className="w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
          <Package size={19} className="text-red" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-gray-900 truncate">{order.store_name}</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
            </span>
          </div>
          <div className="text-xs text-gray-400">
            #{order.order_id.slice(0, 8).toUpperCase()} · {Number(order.total).toFixed(2)} €
          </div>
        </div>
        {Number(order.unread_messages) > 0 && (
          <Link href={`/bestellung/${order.order_id}`}
            className="relative w-9 h-9 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-red" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-white text-[10px] font-black rounded-full flex items-center justify-center">
              {order.unread_messages}
            </span>
          </Link>
        )}
      </div>

      {/* Map */}
      {order.shopper_lat && (
        <div className="relative">
          <div ref={mapRef} className="w-full h-40" />
          {order.status === 'in_transit' && (
            <div className="absolute top-3 left-3 bg-white rounded-lg shadow px-2.5 py-1.5 flex items-center gap-1.5">
              <Navigation size={11} className="text-green-600 animate-pulse" />
              <span className="text-[10px] font-black text-gray-700">Live-Position</span>
            </div>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => {
            const done = i <= step
            const current = i === step
            const Icon = s.icon
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-center">
                  {i > 0 && <div className={`flex-1 h-0.5 ${i <= step ? 'bg-red' : 'bg-gray-100'}`} />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-red' : 'bg-gray-100'
                  } ${current ? 'ring-4 ring-red/15' : ''}`}>
                    <Icon size={13} className={done ? 'text-white' : 'text-gray-300'} />
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-red' : 'bg-gray-100'}`} />}
                </div>
                <span className={`text-[9px] font-bold text-center ${done ? 'text-gray-700' : 'text-gray-300'}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Shopper or waiting */}
        {order.shopper_name ? (
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-orange/20 flex items-center justify-center text-base flex-shrink-0">
              🚴
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-gray-900 truncate">{order.shopper_name}</div>
              <div className="text-[11px] text-gray-400 flex items-center gap-1">
                {order.shopper_rating && (
                  <><Star size={9} className="fill-orange text-orange" />{Number(order.shopper_rating).toFixed(1)} · </>
                )}
                {order.status === 'shopping' ? 'kauft gerade ein'
                  : order.status === 'in_transit' ? 'ist unterwegs zu Ihnen'
                  : 'macht sich auf den Weg'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-red/10 flex items-center justify-center flex-shrink-0">
              <UserSearch size={16} className="text-red animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-gray-900">Wir suchen einen Shopper</div>
              <div className="text-[11px] text-gray-400">
                Der erste, der zusagt, übernimmt Ihre Bestellung
              </div>
            </div>
          </div>
        )}

        {/* 8h deadline */}
        {hoursLeft > 0 && (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 text-[11px] ${
            urgent ? 'bg-red/10 text-red'
            : warn ? 'bg-orange-50 text-orange-700'
            : 'bg-gray-50 text-gray-500'
          }`}>
            {urgent ? <AlertTriangle size={12} className="flex-shrink-0" />
                    : <Clock size={12} className="flex-shrink-0" />}
            <span className="font-bold">
              {hoursLeft < 1
                ? `Noch ${Math.round(hoursLeft * 60)} Minuten`
                : `Noch ${hoursLeft} Stunden`}
            </span>
            <span className="opacity-70">
              — danach wird automatisch storniert und erstattet
            </span>
          </div>
        )}

        <Link href={`/bestellung/${order.order_id}`}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-black rounded-xl py-3 text-sm hover:bg-black transition-colors">
          Bestellung verfolgen <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  )
}
