'use client'
// app/bestellung/[id]/page.tsx — live tracking with GPS + proofs
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle2, Clock, ShoppingCart, Truck, Package, MapPin,
  ArrowLeft, Star, MessageCircle, X, ChevronRight, Loader2,
  UserSearch, RefreshCw, Receipt, Camera, Navigation
} from 'lucide-react'
import { OrderChat } from '@/components/chat/order-chat'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

const STEPS = [
  { status: 'pending',    label: 'Bestellt',           icon: Clock },
  { status: 'confirmed',  label: 'Shopper zugewiesen', icon: CheckCircle2 },
  { status: 'shopping',   label: 'Wird eingekauft',    icon: ShoppingCart },
  { status: 'in_transit', label: 'Unterwegs zu Ihnen', icon: Truck },
  { status: 'delivered',  label: 'Geliefert',          icon: Package },
]
const IDX: Record<string, number> = { pending:0, confirmed:1, shopping:2, in_transit:3, delivered:4 }
const MSG: Record<string, string> = {
  pending:    'Wir suchen einen Shopper in Ihrer Nähe.',
  confirmed:  'Ein Shopper wurde zugewiesen und macht sich auf den Weg zum Markt.',
  shopping:   'Ihr Shopper kauft gerade Ihre Artikel ein.',
  in_transit: 'Ihr Shopper ist unterwegs — Sie sehen seine Position live.',
  delivered:  'Ihre Bestellung wurde geliefert. Guten Appetit! 🎉',
}

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const shopperMarker = useRef<any>(null)

  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [shopper, setShopper] = useState<any>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showPhoto, setShowPhoto] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [ratingToken, setRatingToken] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

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
      .from('orders').select('*, stores(name, address)').eq('id', id).single()
    if (!o) { router.push('/konto'); return }
    setOrder(o)

    const { data: oi } = await supabase
      .from('order_items').select('*, products(name, unit)').eq('order_id', id)
    setItems(oi || [])

    if (o.shopper_id) {
      const { data: u } = await supabase
        .from('users').select('id, full_name, phone').eq('id', o.shopper_id).maybeSingle()
      const { data: s } = await supabase
        .from('shoppers').select('rating, total_deliveries').eq('user_id', o.shopper_id).maybeSingle()
      setShopper({ ...u, ...s })

      const { data: pos } = await supabase.rpc('get_latest_position', { p_order_id: id })
      if (pos?.[0]) setPosition({ lat: pos[0].lat, lng: pos[0].lng })
    }

    const { data: cands } = await supabase.rpc('get_order_candidates', { p_order_id: id })
    setCandidates(cands || [])

    if (o.status === 'delivered') {
      const { data: t } = await supabase
        .from('rating_tokens').select('token, used').eq('order_id', id).maybeSingle()
      if (t && !t.used) setRatingToken(t.token)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // Realtime order + GPS
  useEffect(() => {
    const ch = supabase.channel(`order-live-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => load())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_tracking', filter: `order_id=eq.${id}` },
        (p: any) => setPosition({ lat: p.new.lat, lng: p.new.lng }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id])

  useEffect(() => {
    if (order?.assignment_status !== 'searching') return
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [order?.assignment_status])

  useEffect(() => {
    if (!myUserId) return
    const ch = supabase.channel(`badge-${id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `order_id=eq.${id}` },
        (p: any) => {
          if (p.new.sender_id !== myUserId && !showChat && p.new.type !== 'system') setUnread(u => u + 1)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, myUserId, showChat])

  // Map
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current || !order?.shopper_id) return
    const g = (window as any).google
    const addr = order.delivery_address
    const center = addr?.lat ? { lat: addr.lat, lng: addr.lng } : { lat: 49.4521, lng: 11.0767 }
    const map = new g.maps.Map(mapRef.current, {
      center, zoom: 13, disableDefaultUI: true, zoomControl: true,
    })
    mapInstance.current = map
    if (addr?.lat) {
      new g.maps.Marker({
        position: { lat: addr.lat, lng: addr.lng }, map,
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 11, fillColor: '#E30B6D',
                fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        title: 'Ihre Adresse',
      })
    }
  }, [mapsReady, order?.shopper_id])

  useEffect(() => {
    if (!mapInstance.current || !position || !mapsReady) return
    const g = (window as any).google
    if (shopperMarker.current) {
      shopperMarker.current.setPosition(position)
    } else {
      shopperMarker.current = new g.maps.Marker({
        position, map: mapInstance.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="#F7A800" stroke="white" stroke-width="3"/>
              <text x="20" y="27" text-anchor="middle" font-size="18">🚴</text>
            </svg>`),
          scaledSize: new g.maps.Size(40, 40),
          anchor: new g.maps.Point(20, 20),
        },
      })
    }
    if (order?.status === 'in_transit') mapInstance.current.panTo(position)
  }, [position, mapsReady, order?.status])

  const retry = async () => {
    setRetrying(true)
    try {
      const res = await fetch('/api/orders/assign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      })
      const d = await res.json()
      toast[d.ok ? 'success' : 'error'](
        d.ok ? `${d.shopper_name} wurde zugewiesen!` : 'Kein Shopper verfügbar — wir suchen weiter'
      )
      load()
    } catch { toast.error('Fehler') }
    setRetrying(false)
  }

  const switchShopper = async (newId: string) => {
    const { data, error } = await supabase.rpc('switch_order_shopper', {
      p_order_id: id, p_new_shopper_id: newId,
    })
    if (error || !data?.ok) {
      toast.error(data?.reason === 'too_late' ? 'Einkauf bereits gestartet' : 'Wechsel fehlgeschlagen')
      return
    }
    toast.success('Shopper gewechselt ✓')
    setShowPicker(false); load()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!order) return null

  const step = IDX[order.status] ?? 0
  const active = !['delivered','cancelled'].includes(order.status)
  const searching = !order.shopper_id && order.assignment_status !== 'assigned'
  const canSwitch = false
  const commission = Number(order.commission ?? order.delivery_fee)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/konto" className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={17} className="text-gray-600" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded-full flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-black text-sm text-gray-900 truncate">
                #{id.slice(0,8).toUpperCase()} · {order.stores?.name}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(order.placed_at).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          </div>
          {order.shopper_id && (
            <button onClick={() => { setShowChat(true); setUnread(0) }}
              className="relative w-9 h-9 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
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
        {searching ? (
          <div className={`rounded-2xl p-6 border ${
            order.assignment_status === 'no_shopper' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center flex-shrink-0">
                <UserSearch size={22} className="text-red animate-pulse" />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-gray-900 mb-1">
                  {order.assignment_status === 'no_shopper' ? 'Gerade kein Shopper verfügbar' : 'Wir suchen einen Shopper…'}
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  Ihre Provision von <strong className="text-gray-900">{commission.toFixed(2)} €</strong> wurde
                  an Shopper in Ihrer Nähe gesendet. Der erste, der zusagt, übernimmt Ihre Bestellung.
                </p>
                <button onClick={retry} disabled={retrying}
                  className="flex items-center gap-2 text-xs font-black text-red border border-red/20 rounded-xl px-4 py-2.5 hover:bg-red/5 transition-all disabled:opacity-50">
                  {retrying ? <><Loader2 size={13} className="animate-spin" /> Wird gesucht…</>
                    : <><RefreshCw size={13} /> Erneut suchen</>}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl p-5 ${
            order.status === 'delivered' ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-100'
          }`}>
            <p className={`font-bold text-sm ${order.status === 'delivered' ? 'text-green-800' : 'text-gray-700'}`}>
              {MSG[order.status]}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {STEPS.map((s, i) => {
            const done = i <= step
            const current = i === step
            const Icon = s.icon
            return (
              <div key={s.status} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done ? 'bg-red border-red' : 'bg-white border-gray-200'
                  } ${current && active ? 'ring-4 ring-red/20 animate-pulse' : ''}`}>
                    <Icon size={16} className={done ? 'text-white' : 'text-gray-300'} />
                  </div>
                  {i < STEPS.length - 1 && <div className={`w-0.5 h-8 mt-1 ${i < step ? 'bg-red' : 'bg-gray-100'}`} />}
                </div>
                <div className="pt-1.5 pb-8">
                  <div className={`font-black text-sm ${done ? 'text-gray-900' : 'text-gray-300'}`}>{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Shopper + live map */}
        {order.shopper_id && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="relative">
              <div ref={mapRef} className="w-full h-48" />
              {order.status === 'in_transit' && position && (
                <div className="absolute top-3 left-3 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 text-xs font-black text-green-700">
                  <Navigation size={13} className="animate-pulse" /> Live-Position
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange/20 flex items-center justify-center text-xl flex-shrink-0">🚴</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Ihr Shopper</div>
                  <div className="font-black text-gray-900 truncate">{shopper?.full_name || '—'}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    {shopper?.rating && (
                      <span className="flex items-center gap-1">
                        <Star size={11} className="fill-orange text-orange" />{Number(shopper.rating).toFixed(1)}
                      </span>
                    )}
                    {shopper?.total_deliveries !== undefined && <span>· {shopper.total_deliveries} Lieferungen</span>}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Proof photos */}
        {(order.receipt_url || order.delivery_photo_url) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black text-gray-900 mb-4">Nachweise</h2>
            <div className="grid grid-cols-2 gap-3">
              {order.receipt_url && (
                <button onClick={() => setShowPhoto(order.receipt_url)} className="text-left">
                  <img src={order.receipt_url} alt="Kassenbon"
                    className="w-full h-28 object-cover rounded-xl border border-gray-100 mb-1.5" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                    <Receipt size={12} /> Kassenbon
                  </div>
                  {order.receipt_amount && (
                    <div className="text-[10px] text-gray-400">{Number(order.receipt_amount).toFixed(2)} €</div>
                  )}
                </button>
              )}
              {order.delivery_photo_url && (
                <button onClick={() => setShowPhoto(order.delivery_photo_url)} className="text-left">
                  <img src={order.delivery_photo_url} alt="Lieferung"
                    className="w-full h-28 object-cover rounded-xl border border-gray-100 mb-1.5" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                    <Camera size={12} /> Zustellnachweis
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Items + total */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-black text-gray-900 mb-4">Ihre Artikel</h2>
          <div className="flex flex-col gap-3">
            {items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">🛒</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">
                    {it.products?.name || it.product_name}
                  </div>
                  <div className="text-xs text-gray-400">{it.quantity}×</div>
                </div>
                <div className="font-black text-sm text-gray-900 flex-shrink-0">
                  {(Number(it.price_at_order) * it.quantity).toFixed(2)} €
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Warenwert</span><span>{Number(order.subtotal).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Servicegebühr</span><span>{Number(order.service_fee || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-700 font-bold">
              <span>Provision Shopper</span><span>{commission.toFixed(2)} €</span>
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

        {order.status === 'delivered' && ratingToken && (
          <Link href={`/bewerten/${ratingToken}`}
            className="bg-orange text-black font-black rounded-2xl p-5 flex items-center gap-3 hover:bg-orange-dark hover:text-white transition-colors">
            <div className="flex gap-1">{[1,2,3,4,5].map(s => <Star key={s} size={17} className="fill-current" />)}</div>
            <div className="flex-1">
              <div className="text-sm">Wie war Ihre Lieferung?</div>
              <div className="text-xs opacity-70 font-normal">Shopper jetzt bewerten</div>
            </div>
          </Link>
        )}
      </div>

      {/* Photo lightbox */}
      {showPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
             onClick={() => setShowPhoto(null)}>
          <img src={showPhoto} alt="" className="max-w-full max-h-full rounded-2xl" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Chat */}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-gray-900">Shopper wählen</h2>
              <button onClick={() => setShowPicker(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {candidates.map((c: any) => (
                <button key={c.user_id}
                  onClick={() => !c.is_current && switchShopper(c.user_id)}
                  disabled={c.is_current}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    c.is_current ? 'border-red bg-red/5 cursor-default' : 'border-gray-100 hover:border-red'
                  }`}>
                  <div className="w-11 h-11 rounded-full bg-orange/20 flex items-center justify-center text-lg flex-shrink-0">🚴</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-gray-900 truncate">{c.full_name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Star size={10} className="fill-orange text-orange" />
                      {Number(c.rating).toFixed(1)} · {c.total_deliveries} Lieferungen
                    </div>
                  </div>
                  {c.is_current
                    ? <span className="text-[10px] font-black text-red bg-red/10 px-2 py-1 rounded-full flex-shrink-0">Aktuell</span>
                    : <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
