'use client'
// app/shopper-portal/page.tsx — Aufträge with earnings breakdown + chat
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Package, MapPin, Clock, Lock, ArrowRight, CreditCard, ShoppingCart, CheckCircle2, Euro, MessageCircle, X } from 'lucide-react'
import { OrderChat } from '@/components/chat/order-chat'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

// Earning calculation: 80% of delivery_fee, 100% tip, minus 10% platform fee
const calcEarnings = (deliveryFee: number, tip: number) => {
  const gross = deliveryFee * 0.8 + tip
  const platformCut = gross * 0.1
  return {
    gross: Math.round(gross * 100) / 100,
    platformCut: Math.round(platformCut * 100) / 100,
    net: Math.round((gross - platformCut) * 100) / 100,
  }
}

export default function AuftraegePage() {
  const [approved, setApproved] = useState<boolean | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [available, setAvailable] = useState<any[]>([])
  const [active, setActive] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [chatOrderId, setChatOrderId] = useState<string | null>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return
    setProfileId(profile.id)

    const { data: app } = await supabase
      .from('shopper_applications').select('status').eq('user_id', profile.id).maybeSingle()
    const isApproved = app?.status === 'approved'
    setApproved(isApproved)

    if (isApproved) {
      const { data: avail } = await supabase
        .from('orders')
        .select('id, status, subtotal, total, delivery_fee, tip_amount, delivery_address, placed_at, stores(name)')
        .eq('status', 'confirmed')
        .is('shopper_id', null)
        .order('placed_at')
      setAvailable(avail || [])

      const { data: mine } = await supabase
        .from('orders')
        .select('id, status, subtotal, total, delivery_fee, tip_amount, delivery_address, placed_at, stores(name)')
        .eq('shopper_id', profile.id)
        .in('status', ['shopping', 'in_transit'])
        .order('placed_at')
      setActive(mine || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!approved) return
    const channel = supabase
      .channel('auftraege-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [approved])

  const acceptOrder = async (orderId: string) => {
    setAccepting(orderId)
    try {
      const res = await fetch('/api/shopper/accept-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Auftrag angenommen! Karte •••• ${data.cardLast4} erstellt`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAccepting(null)
    }
  }

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({
      status,
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    if (error) { toast.error('Fehler'); return }
    if (status === 'delivered') toast.success('Lieferung bestätigt! 🎉 Ihr Verdienst wurde gutgeschrieben.')
    else toast.success('Status aktualisiert')
    load()
  }

  if (loading) return <div className="text-sm text-gray-400 p-8">Lädt...</div>

  if (!approved) return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-orange/15 flex items-center justify-center mx-auto mb-5">
          <Lock size={26} className="text-orange-dark" />
        </div>
        <h1 className="font-black text-xl text-gray-900 mb-2">Noch nicht freigeschaltet</h1>
        <p className="text-sm text-gray-500 mb-6">Reichen Sie zunächst Ihre Dokumente ein.</p>
        <a href="/shopper-portal/dokumente" className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
          Zu den Dokumenten <ArrowRight size={15} />
        </a>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Aufträge</h1>
          <p className="text-sm text-gray-500 mt-1">{available.length} verfügbar · {active.length} aktiv</p>
        </div>
      </div>

      {/* Active orders */}
      {active.length > 0 && (
        <>
          <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">🛒 Aktive Aufträge</h2>
          <div className="flex flex-col gap-4 mb-10">
            {active.map((order: any) => {
              const earnings = calcEarnings(Number(order.delivery_fee), Number(order.tip_amount))
              return (
                <div key={order.id} className="bg-white rounded-2xl border-2 border-orange/30 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-black text-gray-900">{order.stores?.name}</div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-light text-orange-dark">
                        {order.status === 'shopping' ? '🛒 Einkaufen' : '🚗 Unterwegs'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <MapPin size={13} /> {order.delivery_address?.street}, {order.delivery_address?.city}
                    </div>

                    {/* Earnings breakdown */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Euro size={14} className="text-green-600" />
                        <span className="font-black text-xs text-gray-900 uppercase tracking-wide">Ihr Verdienst</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Liefergebühr (80%)</span>
                        <span>{(Number(order.delivery_fee) * 0.8).toFixed(2)} €</span>
                      </div>
                      {Number(order.tip_amount) > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Trinkgeld (100%)</span>
                          <span>{Number(order.tip_amount).toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Plattformgebühr (−10%)</span>
                        <span>−{earnings.platformCut.toFixed(2)} €</span>
                      </div>
                      <div className="border-t border-gray-200 pt-1.5 flex justify-between font-black text-sm">
                        <span className="text-gray-900">Netto</span>
                        <span className="text-green-600">{earnings.net.toFixed(2)} €</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {/* Chat button */}
                      <button
                        onClick={() => setChatOrderId(order.id)}
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-100 text-gray-600 font-bold rounded-xl py-2.5 text-sm hover:border-red hover:text-red transition-all"
                      >
                        <MessageCircle size={15} /> Chat
                      </button>

                      {order.status === 'shopping' && (
                        <button
                          onClick={() => updateStatus(order.id, 'in_transit')}
                          className="flex-1 bg-gray-900 text-white font-bold rounded-xl py-2.5 text-sm hover:bg-black transition-colors"
                        >
                          → Unterwegs
                        </button>
                      )}
                      {order.status === 'in_transit' && (
                        <button
                          onClick={() => updateStatus(order.id, 'delivered')}
                          className="flex-1 bg-green-600 text-white font-bold rounded-xl py-2.5 text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={15} /> Geliefert
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Available orders */}
      <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">📦 Verfügbare Aufträge</h2>
      {available.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Keine Aufträge verfügbar</p>
          <p className="text-sm text-gray-400">Neue Aufträge erscheinen hier automatisch.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {available.map((order: any) => {
            const earnings = calcEarnings(Number(order.delivery_fee), Number(order.tip_amount))
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-gray-900">{order.stores?.name}</div>
                  <div className="text-right">
                    <div className="font-black text-green-600">{earnings.net.toFixed(2)} €</div>
                    <div className="text-[10px] text-gray-400 uppercase">Netto</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <MapPin size={13} /> {order.delivery_address?.street}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><ShoppingCart size={12} /> {Number(order.subtotal).toFixed(2)} €</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.placed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {/* Mini earnings */}
                <div className="bg-green-50 rounded-xl px-3 py-2 mb-3 flex justify-between text-xs">
                  <span className="text-gray-500">Brutto {earnings.gross.toFixed(2)} € − Gebühr {earnings.platformCut.toFixed(2)} €</span>
                  <span className="font-black text-green-700">= {earnings.net.toFixed(2)} €</span>
                </div>
                <button
                  onClick={() => acceptOrder(order.id)}
                  disabled={accepting === order.id}
                  className="w-full bg-orange text-black font-black rounded-xl py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard size={15} />
                  {accepting === order.id ? 'Karte wird erstellt...' : `Annehmen + Karte erhalten`}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Chat modal */}
      {chatOrderId && profileId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setChatOrderId(null)} />
          <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900">Chat mit Kunde</h2>
              <button onClick={() => setChatOrderId(null)} className="w-8 h-8 rounded-xl border border-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <OrderChat
                orderId={chatOrderId}
                myRole="shopper"
                myUserId={profileId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
