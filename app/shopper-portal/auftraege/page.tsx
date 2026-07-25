'use client'
// app/shopper-portal/auftraege/page.tsx — Shopper applies for orders
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Package, MapPin, Clock, Euro, CheckCircle2, Loader2 } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const calcNet = (deliveryFee: number, tip: number) => {
  const gross = deliveryFee * 0.8 + tip
  return Math.round((gross - gross * 0.1) * 100) / 100
}

export default function AuftraegeApplyPage() {
  const [profileId, setProfileId] = useState<string | null>(null)
  const [available, setAvailable] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<string[]>([])
  const [myActiveOrders, setMyActiveOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return
    setProfileId(profile.id)

    // Available orders (pending, notified to this shopper)
    const { data: apps } = await supabase
      .from('shopper_order_applications')
      .select('order_id, status')
      .eq('shopper_id', profile.id)
    setMyApplications((apps || []).filter(a => a.status === 'pending').map(a => a.order_id))

    // Orders notified to this shopper
    const appOrderIds = (apps || []).map(a => a.order_id)
    if (appOrderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, subtotal, delivery_fee, tip_amount, distance_km, is_peak_hour, placed_at, stores(name)')
        .in('id', appOrderIds)
        .eq('status', 'pending')
      setAvailable(orders || [])
    } else {
      setAvailable([])
    }

    // My active orders
    const { data: active } = await supabase
      .from('orders')
      .select('id, status, subtotal, delivery_fee, tip_amount, distance_km, placed_at, stores(name), delivery_address')
      .eq('shopper_id', profile.id)
      .in('status', ['confirmed', 'shopping', 'in_transit'])
    setMyActiveOrders(active || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const channel = supabase
      .channel('shopper-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopper_order_applications' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const applyForOrder = async (orderId: string) => {
    setApplying(orderId)
    const { error } = await supabase
      .from('shopper_order_applications')
      .upsert({ order_id: orderId, shopper_id: profileId, status: 'pending' })
    setApplying(null)
    if (error) { toast.error('Fehler bei der Bewerbung'); return }
    toast.success('Bewerbung eingereicht! Sie werden benachrichtigt, wenn Sie ausgewählt werden.')
    load()
  }

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({
      status,
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    if (status === 'delivered') toast.success('Lieferung bestätigt! 🎉')
    load()
  }

  if (loading) return <div className="text-sm text-gray-400 p-8">Lädt...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Aufträge</h1>
        <p className="text-sm text-gray-500 mt-1">{available.length} neue Aufträge · {myActiveOrders.length} aktiv</p>
      </div>

      {/* Active orders */}
      {myActiveOrders.length > 0 && (
        <>
          <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">🛒 Meine aktiven Aufträge</h2>
          <div className="flex flex-col gap-4 mb-8">
            {myActiveOrders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-2xl border-2 border-orange/30 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-gray-900">{order.stores?.name}</div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-light text-orange-dark capitalize">
                    {order.status === 'confirmed' ? '✓ Ausgewählt' : order.status === 'shopping' ? '🛒 Einkaufen' : '🚗 Unterwegs'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <MapPin size={13} /> {order.delivery_address?.street}
                  {order.distance_km && <span>· {order.distance_km} km</span>}
                </div>
                <div className="bg-green-50 rounded-xl px-3 py-2 mb-3 flex justify-between text-xs">
                  <span className="text-gray-500">Ihr Nettoverdienst</span>
                  <span className="font-black text-green-700">{calcNet(Number(order.delivery_fee), Number(order.tip_amount)).toFixed(2)} €</span>
                </div>
                <div className="flex gap-2">
                  {order.status === 'confirmed' && (
                    <button onClick={() => updateStatus(order.id, 'shopping')}
                      className="flex-1 bg-gray-900 text-white font-bold rounded-xl py-2.5 text-sm">
                      Einkauf starten
                    </button>
                  )}
                  {order.status === 'shopping' && (
                    <button onClick={() => updateStatus(order.id, 'in_transit')}
                      className="flex-1 bg-gray-900 text-white font-bold rounded-xl py-2.5 text-sm">
                      → Unterwegs
                    </button>
                  )}
                  {order.status === 'in_transit' && (
                    <button onClick={() => updateStatus(order.id, 'delivered')}
                      className="flex-1 bg-green-600 text-white font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={15} /> Geliefert bestätigen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Available orders to apply */}
      <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">📧 Neue Aufträge für Sie</h2>
      {available.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Keine neuen Aufträge</p>
          <p className="text-sm text-gray-400">Sie werden per E-Mail benachrichtigt, wenn ein Auftrag in Ihrer Nähe verfügbar ist.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {available.map((order: any) => {
            const hasApplied = myApplications.includes(order.id)
            const net = calcNet(Number(order.delivery_fee), Number(order.tip_amount))
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-gray-900">{order.stores?.name}</div>
                  <div className="text-right">
                    <div className="font-black text-green-600">{net.toFixed(2)} €</div>
                    <div className="text-[10px] text-gray-400">Netto</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3 flex-wrap">
                  {order.distance_km && <span className="flex items-center gap-1"><MapPin size={12} /> {order.distance_km} km</span>}
                  <span className="flex items-center gap-1"><Euro size={12} /> {Number(order.subtotal).toFixed(2)} € Warenwert</span>
                  {order.is_peak_hour && <span className="flex items-center gap-1 text-orange-500 font-bold"><Clock size={12} /> Stoßzeit +30%</span>}
                </div>
                <button
                  onClick={() => applyForOrder(order.id)}
                  disabled={hasApplied || applying === order.id}
                  className={`w-full font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors ${
                    hasApplied
                      ? 'bg-green-50 text-green-700 border-2 border-green-200'
                      : 'bg-orange text-black hover:bg-orange-dark hover:text-white'
                  }`}
                >
                  {applying === order.id ? <Loader2 size={15} className="animate-spin" /> :
                   hasApplied ? <><CheckCircle2 size={15} /> Beworben — warte auf Auswahl</> :
                   'Für diesen Auftrag bewerben →'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
