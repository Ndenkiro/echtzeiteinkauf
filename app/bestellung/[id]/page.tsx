'use client'
// app/bestellung/[id]/page.tsx — Live tracking + shopper selection + chat
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Clock, ShoppingCart, Truck, Package, MapPin, ArrowLeft, Star, MessageCircle, X, ChevronRight } from 'lucide-react'
import { OrderChat } from '@/components/chat/order-chat'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU4Z'

const STEPS = [
  { status: 'pending',    label: 'Bestellt',           icon: Clock        },
  { status: 'confirmed',  label: 'Bestätigt',          icon: CheckCircle2 },
  { status: 'shopping',   label: 'Wird eingekauft',    icon: ShoppingCart },
  { status: 'in_transit', label: 'Unterwegs zu Ihnen', icon: Truck        },
  { status: 'delivered',  label: 'Geliefert ✓',        icon: Package      },
]
const STATUS_INDEX: Record<string, number> = {
  pending: 0, confirmed: 1, shopping: 2, in_transit: 3, delivered: 4,
}
const STATUS_MSG: Record<string, string> = {
  pending:    'Ihre Bestellung wartet auf Bestätigung.',
  confirmed:  'Bestätigt — ein Shopper wird zugewiesen.',
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
      const s = diff % 60
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [placedAt])
  return elapsed
}

export default function BestellungTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const shopperMarkerRef = useRef<any>(null)

  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [shopper, setShopper] = useState<any>(null)
  const [shopperLoc, setShopperLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [availableShoppers, setAvailableShoppers] = useState<any[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showShopperPicker, setShowShopperPicker] = useState(false)
  const [changingShopper, setChangingShopper] = useState(false)
  const [ratingToken, setRatingToken] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  const elapsed = useElapsed(order?.placed_at || null)
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  // Load Google Maps
  useEffect(() => {
    if ((window as any).google?.maps) { setMapsReady(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&language=de`
    script.async = true
    script.onload = () => setMapsReady(true)
    document.head.appendChild(script)
  }, [])

  const loadOrder = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/anmelden'); return }
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
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

    if (o.shopper_id) {
      const { data: sh } = await supabase
        .from('users').select('id, full_name, phone')
        .eq('id', o.shopper_id).single()
      setShopper(sh)

      const { data: shopperRow } = await supabase
        .from('shoppers').select('rating, total_deliveries')
        .eq('user_id', o.shopper_id).single()
      if (shopperRow) setShopper((prev: any) => ({ ...prev, ...shopperRow }))

      const { data: loc } = await supabase
        .from('shopper_locations').select('lat, lng')
        .eq('is_online', true).limit(1).maybeSingle()
      if (loc) setShopperLoc({ lat: loc.lat, lng: loc.lng })
    }

    if (o.status === 'delivered') {
      const { data: token } = await supabase
        .from('rating_tokens').select('token, used').eq('order_id', id).maybeSingle()
      if (token && !token.used) setRatingToken(token.token)
    }

    // Load available shoppers for picker
    const { data: shoppers } = await supabase
      .from('shoppers')
      .select('id, user_id, rating, total_deliveries, users(full_name)')
      .eq('status', 'available')
    setAvailableShoppers(shoppers || [])

    setLoading(false)
  }

  useEffect(() => { loadOrder() }, [id])

  // Realtime order updates
  useEffect(() => {
    const channel = supabase.channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => loadOrder())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Realtime new messages → unread count
  useEffect(() => {
    if (!myUserId) return
    const channel = supabase.channel(`chat-unread-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `order_id=eq.${id}` },
        (payload: any) => {
          if (payload.new.sender_id !== myUserId && !showChat) {
            setUnread(u => u + 1)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, myUserId, showChat])

  // Init map
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current || !order) return
    const g = (window as any).google
    const map = new g.maps.Map(mapRef.current, {
      center: { lat: 49.4521, lng: 11.0767 },
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
    })
    mapInstance.current = map
    const addr = order.delivery_address
    if (addr?.lat && addr?.lng) {
      new g.maps.Marker({
        position: { lat: addr.lat, lng: addr.lng }, map,
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#E30B6D', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
      })
    }
  }, [mapsReady, order])

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
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="17" fill="#F7A800" stroke="white" stroke-width="3"/>
              <text x="20" y="27" text-anchor="middle" font-size="18">🚴</text>
            </svg>`),
          scaledSize: new g.maps.Size(40, 40),
          anchor: new g.maps.Point(20, 20),
        },
      })
    }
    mapInstance.current.panTo(shopperLoc)
  }, [shopperLoc, mapsReady])

  const changeShopper = async (newShopperUserId: string) => {
    if (!order || changingShopper) return
    setChangingShopper(true)
    const { error } = await supabase
      .from('orders').update({ shopper_id: newShopperUserId }).eq('id', order.id)
    setChangingShopper(false)
    if (error) { toast.error('Fehler beim Wechsel'); return }
    toast.success('Shopper gewechselt ✓')
    setShowShopperPicker(false)
    loadOrder()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!order) return null

  const stepIndex = STATUS_INDEX[order.status] ?? 0
  const isActive = !['delivered', 'cancelled'].includes(order.status)
  const canChat = order.shopper_id && !['pending', 'delivered', 'cancelled'].includes(order.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/konto" className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center">
            <ArrowLeft size={17} className="text-gray-600" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded-full" />
            <div className="min-w-0">
              <div className="font-black text-sm text-gray-900 truncate">#{id.slice(0,8).toUpperCase()} · {order.stores?.name}</div>
              <div className="text-xs text-gray-400">{elapsed} her</div>
            </div>
          </div>
          {isActive && <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
          </div>}
          {canChat && (
            <button onClick={() => { setShowChat(true); setUnread(0) }} className="relative w-9 h-9 rounded-xl bg-red/10 flex items-center justify-center">
              <MessageCircle size={17} className="text-red" />
              {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-white text-[10px] font-black rounded-full flex items-center justify-center">{unread}</span>}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* Status */}
        <div className={`rounded-2xl p-5 ${order.status === 'delivered' ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-100'}`}>
          <p className={`font-bold text-sm ${order.status === 'delivered' ? 'text-green-800' : 'text-gray-700'}`}>
            {STATUS_MSG[order.status]}
          </p>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col gap-0">
            {STEPS.map((step, i) => {
              const done = i <= stepIndex
              const current = i === stepIndex
              const Icon = step.icon
              return (
                <div key={step.status} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-red border-red' : 'bg-white border-gray-200'} ${current && isActive ? 'ring-4 ring-red/20 animate-pulse' : ''}`}>
                      <Icon size={16} className={done ? 'text-white' : 'text-gray-300'} />
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-0.5 h-8 mt-1 ${i < stepIndex ? 'bg-red' : 'bg-gray-100'}`} />}
                  </div>
                  <div className="pt-1.5 pb-8">
                    <div className={`font-black text-sm ${done ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Shopper card */}
        {order.shopper_id && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div ref={mapRef} className="w-full h-40" />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-orange/20 flex items-center justify-center text-xl flex-shrink-0">🚴</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-gray-900">{shopper?.full_name || 'Ihr Shopper'}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {shopper?.rating && <span>⭐ {shopper.rating}</span>}
                    {shopper?.total_deliveries && <span>· {shopper.total_deliveries} Lieferungen</span>}
                  </div>
                </div>
                {isActive && (
                  <button onClick={() => setShowShopperPicker(true)} className="text-xs font-bold text-red hover:underline flex-shrink-0">
                    Wechseln
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-black text-gray-900 mb-4">Ihre Artikel</h2>
          <div className="flex flex-col gap-3">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">🛒</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{item.products?.name || item.product_name}</div>
                  <div className="text-xs text-gray-400">{item.quantity}×</div>
                </div>
                <div className="font-black text-sm text-gray-900">{(Number(item.price_at_order) * item.quantity).toFixed(2)} €</div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-black text-gray-900">
            <span>Gesamt</span><span>{Number(order.total).toFixed(2)} €</span>
          </div>
        </div>

        {/* Rating CTA */}
        {order.status === 'delivered' && ratingToken && (
          <Link href={`/bewerten/${ratingToken}`} className="bg-orange text-black font-black rounded-2xl p-5 flex items-center gap-3 hover:bg-orange-dark hover:text-white transition-colors">
            <div className="flex gap-1">{[1,2,3,4,5].map(s => <Star key={s} size={18} className="fill-current" />)}</div>
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
              <OrderChat
                orderId={id}
                myRole="customer"
                myUserId={myUserId}
                disabled={!canChat}
              />
            </div>
          </div>
        </div>
      )}

      {/* Shopper picker */}
      {showShopperPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-gray-900">Shopper wechseln</h2>
              <button onClick={() => setShowShopperPicker(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            {availableShoppers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Keine anderen Shopper verfügbar</p>
            ) : (
              <div className="flex flex-col gap-3">
                {availableShoppers.map((s: any) => {
                  const user = Array.isArray(s.users) ? s.users[0] : s.users
                  return (
                    <button
                      key={s.id}
                      onClick={() => changeShopper(s.user_id)}
                      disabled={changingShopper || s.user_id === order.shopper_id}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${s.user_id === order.shopper_id ? 'border-red bg-red/5' : 'border-gray-100 hover:border-red'}`}
                    >
                      <div className="w-11 h-11 rounded-full bg-orange/20 flex items-center justify-center text-xl">🚴</div>
                      <div className="flex-1">
                        <div className="font-black text-sm text-gray-900">{user?.full_name || 'Shopper'}</div>
                        <div className="text-xs text-gray-400">⭐ {s.rating || '5.0'} · {s.total_deliveries || 0} Lieferungen</div>
                      </div>
                      {s.user_id === order.shopper_id
                        ? <span className="text-xs font-bold text-red">Aktuell</span>
                        : <ChevronRight size={16} className="text-gray-300" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
