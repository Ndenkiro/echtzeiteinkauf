'use client'
// app/bestellung/[id]/page.tsx — live tracking + shopper assignment
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle2, Clock, ShoppingCart, Truck, Package, MapPin,
  ArrowLeft, Star, MessageCircle, X, ChevronRight, Loader2,
  UserSearch, RefreshCw, AlertCircle
} from 'lucide-react'
import { OrderChat } from '@/components/chat/order-chat'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU4Z'

const STEPS = [
  { status: 'pending',    label: 'Bestellt',           icon: Clock },
  { status: 'confirmed',  label: 'Shopper zugewiesen', icon: CheckCircle2 },
  { status: 'shopping',   label: 'Wird eingekauft',    icon: ShoppingCart },
  { status: 'in_transit', label: 'Unterwegs zu Ihnen', icon: Truck },
  { status: 'delivered',  label: 'Geliefert',          icon: Package },
]
const STATUS_INDEX: Record<string, number> = {
  pending: 0, confirmed: 1, shopping: 2, in_transit: 3, delivered: 4,
}
const STATUS_MSG: Record<string, string> = {
  pending:    'Wir suchen einen Shopper in Ihrer Nähe.',
  confirmed:  'Ein Shopper wurde zugewiesen und macht sich auf den Weg.',
  shopping:   'Ihr Shopper kauft gerade Ihre Artikel ein.',
  in_transit: 'Ihr Shopper ist auf dem Weg zu Ihnen!',
  delivered:  'Ihre Bestellung wurde geliefert. Guten Appetit! 🎉',
}

function useElapsed(placedAt: string | null) {
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!placedAt) return
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(placedAt).getTime()) / 1000)
      const m = Math.floor(diff / 60)
      setElapsed(m > 0 ? `${m} Min.` : `${diff} Sek.`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [placedAt])
  return elapsed
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const shopperMarkerRef = useRef<any>(null)

  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [shopper, setShopper] = useState<any>(null)
  const [shopperLoc, setShopperLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [ratingToken, setRatingToken] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  const elapsed = useElapsed(order?.placed_at || null)
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    if ((window as any).google?.maps) { setMapsReady(true); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&language=de`
    s.async = true
    s.onload = () => setMapsReady(true)
    document.head.appendChild(s)
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/anmelden'); return }
    const { data: profile } = await supabase
      .from('users').select('id').eq('auth_id', user.id).maybeSingle()
    if (profile) setMyUserId(profile.id)

    const { data: o } = await supabase
      .from('orders')
      .select('*, stores(name, address)')
      .eq('id', id)
      .single()
    if (!o) { router.push('/konto'); return }
    setOrder(o)

    const { data: oi } = await supabase
      .from('order_items')
      .select('*, products(name, unit)')
      .eq('order_id', id)
    setItems(oi || [])

    // Assigned shopper
    if (o.shopper_id) {
      const { data: u } = await supabase
        .from('users').select('id, full_name, phone').eq('id', o.shopper_id).maybeSingle()
      const { data: s } = await supabase
        .from('shoppers').select('rating, total_deliveries').eq('user_id', o.shopper_id).maybeSingle()
      setShopper({ ...u, ...s })

      const { data: sRow } = await supabase
        .from('shoppers').select('id').eq('user_id', o.shopper_id).maybeSingle()
      if (sRow) {
        const { data: loc } = await supabase
          .from('shopper_locations').select('lat, lng').eq('shopper_id', sRow.id).maybeSingle()
        if (loc) setShopperLoc({ lat: loc.lat, lng: loc.lng })
      }
    } else {
      setShopper(null)
    }

    // Candidates
    const { data: cands } = await supabase.rpc('get_order_candidates', { p_order_id: id })
    setCandidates(cands || [])

    if (o.status === 'delivered') {
      const { data: token } = await supabase
        .from('rating_tokens').select('token, used').eq('order_id', id).maybeSingle()
      if (token && !token.used) setRatingToken(token.token)
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Realtime order changes
  useEffect(() => {
    const ch = supabase.channel(`order-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id])

  // Poll while searching for a shopper
  useEffect(() => {
    if (order?.assignment_status !== 'searching') return
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [order?.assignment_status])

  // Unread chat badge
  useEffect(() => {
    if (!myUserId) return
    const ch = supabase.channel(`chat-badge-${id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `order_id=eq.${id}` },
        (p: any) => {
          if (p.new.sender_id !== myUserId && !showChat && p.new.type !== 'system') {
            setUnread(u => u + 1)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, myUserId, showChat])

  // Map init
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current || !order?.shopper_id) return
    const g = (window as any).google
    const addr = order.delivery_address
    const center = addr?.lat ? { lat: addr.lat, lng: addr.lng } : { lat: 49.4521, lng: 11.0767 }

    const map = new g.maps.Map(mapRef.current, {
      center, zoom: 13, disableDefaultUI: true, zoomControl: true,
    })
    mapInstance.current = map

    if (addr?.lat && addr?.lng) {
      new g.maps.Marker({
        position: { lat: addr.lat, lng: addr.lng }, map,
        icon: {
          path: g.maps.SymbolPath.CIRCLE, scale: 11,
          fillColor: '#E30B6D', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 3,
        },
        title: 'Ihre Lieferadresse',
      })
    }
  }, [mapsReady, order?.shopper_id])

  // Shopper marker
  useEffect(() => {
    if (!mapInstance.current || !shopperLoc || !mapsReady) return
    const g = (window as any).google
    if (shopperMarkerRef.current) {
      shopperMarkerRef.current.setPosition(shopperLoc)
    } else {
      shopperMarkerRef.current = new g.maps.Marker({
        position: shopperLoc, map: mapInstance.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="#F7A800" stroke="white" stroke-width="3"/>
              <text x="20" y="27" text-anchor="middle" font-size="18">🚴</text>
            </svg>`),
          scaledSize: new g.maps.Size(40, 40),
          anchor: new g.maps.Point(20, 20),
        },
        title: 'Ihr Shopper',
      })
    }
  }, [shopperLoc, mapsReady])

  const switchShopper = async (newShopperId: string) => {
    setSwitching(true)
    const { data, error } = await supabase.rpc('switch_order_shopper', {
      p_order_id: id, p_new_shopper_id: newShopperId,
    })
    setSwitching(false)
    if (error || !data?.ok) {
      toast.error(data?.reason === 'too_late'
        ? 'Der Einkauf hat bereits begonnen — Wechsel nicht mehr möglich'
        : 'Wechsel fehlgeschlagen')
      return
    }
    toast.success('Shopper gewechselt ✓')
    setShowPicker(false)
    load()
  }

  const retryAssignment = async () => {
    setRetrying(true)
    try {
      const res = await fetch('/api/orders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      })
      const data = await res.json()
      if (data.ok) toast.success(`${data.shopper_name} wurde zugewiesen!`)
      else toast.error('Aktuell ist kein Shopper verfügbar. Wir suchen weiter.')
      load()
    } catch {
      toast.error('Fehler bei der Suche')
    }
    setRetrying(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!order) return null

  const stepIndex = STATUS_INDEX[order.status] ?? 0
  const isActive = !['delivered', 'cancelled'].includes(order.status)
  const canChat = order.shopper_id && order.status !== 'cancelled'
  const canSwitch = ['pending', 'confirmed'].includes(order.status) && candidates.length > 1
  const isSearching = !order.shopper_id && order.assignment_status !== 'assigned'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/konto" className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={17} className="text-gray-600" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded-full flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-black text-sm text-gray-900 truncate">
                #{id.slice(0, 8).toUpperCase()} · {order.stores?.name}
              </div>
              <div className="text-xs text-gray-400">vor {elapsed}</div>
            </div>
          </div>
          {isActive && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
            </div>
          )}
          {canChat && (
            <button
              onClick={() => { setShowChat(true); setUnread(0) }}
              className="relative w-9 h-9 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0"
            >
              <MessageCircle size={17} className="text-red" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-5">

        {/* ── Searching for a shopper ── */}
        {isSearching && (
          <div className={`rounded-2xl p-6 border ${
            order.assignment_status === 'no_shopper'
              ? 'bg-orange-50 border-orange-200'
              : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                order.assignment_status === 'no_shopper' ? 'bg-orange/20' : 'bg-red/10'
              }`}>
                {order.assignment_status === 'no_shopper'
                  ? <AlertCircle size={22} className="text-orange-dark" />
                  : <UserSearch size={22} className="text-red animate-pulse" />}
              </div>
              <div className="flex-1">
                <h2 className="font-black text-gray-900 mb-1">
                  {order.assignment_status === 'no_shopper'
                    ? 'Gerade kein Shopper verfügbar'
                    : 'Wir suchen einen Shopper…'}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {order.assignment_status === 'no_shopper'
                    ? 'Alle Shopper in Ihrer Nähe sind derzeit im Einsatz. Sobald jemand frei wird, weisen wir ihn Ihrer Bestellung zu.'
                    : 'Shopper in Ihrer Umgebung wurden benachrichtigt. Das dauert normalerweise nur wenige Minuten.'}
                </p>
                <button
                  onClick={retryAssignment}
                  disabled={retrying}
                  className="flex items-center gap-2 text-xs font-black text-red border border-red/20 rounded-xl px-4 py-2.5 hover:bg-red/5 transition-all disabled:opacity-50"
                >
                  {retrying
                    ? <><Loader2 size={13} className="animate-spin" /> Wird gesucht…</>
                    : <><RefreshCw size={13} /> Erneut suchen</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status message */}
        {!isSearching && (
          <div className={`rounded-2xl p-5 ${
            order.status === 'delivered'
              ? 'bg-green-50 border border-green-200'
              : 'bg-white border border-gray-100'
          }`}>
            <p className={`font-bold text-sm ${
              order.status === 'delivered' ? 'text-green-800' : 'text-gray-700'
            }`}>
              {STATUS_MSG[order.status]}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {STEPS.map((step, i) => {
            const done = i <= stepIndex
            const current = i === stepIndex
            const Icon = step.icon
            return (
              <div key={step.status} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done ? 'bg-red border-red' : 'bg-white border-gray-200'
                  } ${current && isActive ? 'ring-4 ring-red/20 animate-pulse' : ''}`}>
                    <Icon size={16} className={done ? 'text-white' : 'text-gray-300'} />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${i < stepIndex ? 'bg-red' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pt-1.5 pb-8">
                  <div className={`font-black text-sm ${done ? 'text-gray-900' : 'text-gray-300'}`}>
                    {step.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Assigned shopper ── */}
        {order.shopper_id && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {shopperLoc && <div ref={mapRef} className="w-full h-44" />}
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange/20 flex items-center justify-center text-xl flex-shrink-0">
                  🚴
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-0.5">
                    Ihr Shopper
                  </div>
                  <div className="font-black text-gray-900 truncate">
                    {shopper?.full_name || 'Wird geladen…'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    {shopper?.rating && (
                      <span className="flex items-center gap-1">
                        <Star size={11} className="fill-orange text-orange" />
                        {Number(shopper.rating).toFixed(1)}
                      </span>
                    )}
                    {shopper?.total_deliveries !== undefined && (
                      <span>· {shopper.total_deliveries} Lieferungen</span>
                    )}
                  </div>
                </div>
                {canSwitch && (
                  <button
                    onClick={() => setShowPicker(true)}
                    className="text-xs font-bold text-red hover:underline flex-shrink-0"
                  >
                    Wechseln
                  </button>
                )}
              </div>

              {canChat && (
                <button
                  onClick={() => { setShowChat(true); setUnread(0) }}
                  className="w-full mt-4 flex items-center justify-center gap-2 border-2 border-gray-100 text-gray-600 font-bold rounded-xl py-2.5 text-sm hover:border-red hover:text-red transition-all"
                >
                  <MessageCircle size={15} /> Nachricht schreiben
                </button>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-black text-gray-900 mb-4">Ihre Artikel</h2>
          <div className="flex flex-col gap-3">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">🛒</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">
                    {item.products?.name || item.product_name}
                  </div>
                  <div className="text-xs text-gray-400">{item.quantity}×</div>
                </div>
                <div className="font-black text-sm text-gray-900 flex-shrink-0">
                  {(Number(item.price_at_order) * item.quantity).toFixed(2)} €
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Zwischensumme</span><span>{Number(order.subtotal).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Liefergebühr{order.distance_km ? ` (${order.distance_km} km)` : ''}</span>
              <span>{Number(order.delivery_fee).toFixed(2)} €</span>
            </div>
            {Number(order.tip_amount) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Trinkgeld</span><span>{Number(order.tip_amount).toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between font-black text-gray-900 border-t border-gray-100 pt-2 mt-1">
              <span>Gesamt</span><span>{Number(order.total).toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-red" />
          </div>
          <div>
            <div className="font-black text-sm text-gray-900">Lieferadresse</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {order.delivery_address?.street}
              {order.delivery_address?.city ? `, ${order.delivery_address.city}` : ''}
            </div>
          </div>
        </div>

        {/* Rating */}
        {order.status === 'delivered' && ratingToken && (
          <Link
            href={`/bewerten/${ratingToken}`}
            className="bg-orange text-black font-black rounded-2xl p-5 flex items-center gap-3 hover:bg-orange-dark hover:text-white transition-colors"
          >
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} size={17} className="fill-current" />)}
            </div>
            <div className="flex-1">
              <div className="text-sm">Wie war Ihre Lieferung?</div>
              <div className="text-xs opacity-70 font-normal">Shopper jetzt bewerten</div>
            </div>
          </Link>
        )}
      </div>

      {/* Chat drawer */}
      {showChat && myUserId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowChat(false)} />
          <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">Chat</h2>
                <p className="text-xs text-gray-400">{shopper?.full_name || 'Ihr Shopper'}</p>
              </div>
              <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-xl border border-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <OrderChat orderId={id} myRole="customer" myUserId={myUserId} />
            </div>
          </div>
        </div>
      )}

      {/* Shopper picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-black text-gray-900">Shopper wählen</h2>
              <button onClick={() => setShowPicker(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Diese Shopper sind in Ihrer Nähe verfügbar.
            </p>

            {candidates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Keine Alternativen verfügbar</p>
            ) : (
              <div className="flex flex-col gap-3">
                {candidates.map((c: any) => (
                  <button
                    key={c.user_id}
                    onClick={() => !c.is_current && switchShopper(c.user_id)}
                    disabled={switching || c.is_current}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      c.is_current
                        ? 'border-red bg-red/5 cursor-default'
                        : 'border-gray-100 hover:border-red'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-orange/20 flex items-center justify-center text-lg flex-shrink-0">
                      🚴
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-gray-900 truncate">
                        {c.full_name || 'Shopper'}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Star size={10} className="fill-orange text-orange" />
                        {Number(c.rating).toFixed(1)} · {c.total_deliveries} Lieferungen
                      </div>
                    </div>
                    {c.is_current
                      ? <span className="text-[10px] font-black text-red bg-red/10 px-2 py-1 rounded-full flex-shrink-0">Aktuell</span>
                      : switching
                        ? <Loader2 size={15} className="animate-spin text-gray-300" />
                        : <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
