'use client'
// app/shopper-portal/page.tsx — Aufträge with accept + virtual card
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Package, MapPin, Clock, Lock, ArrowRight, CreditCard, Eye, EyeOff, CheckCircle2, ShoppingCart, Copy } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type CardDetails = {
  number: string; cvc: string; exp_month: number; exp_year: number
  last4: string; spending_limit: number; amount_spent: number
}

export default function AuftraegePage() {
  const [approved, setApproved] = useState<boolean | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [available, setAvailable] = useState<any[]>([])
  const [active, setActive] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [cardDetails, setCardDetails] = useState<Record<string, CardDetails>>({})
  const [showCard, setShowCard] = useState<string | null>(null)

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
      // Available orders (confirmed, no shopper)
      const { data: avail } = await supabase
        .from('orders')
        .select('id, status, subtotal, total, delivery_fee, tip_amount, delivery_address, placed_at, stores(name, address)')
        .eq('status', 'confirmed')
        .is('shopper_id', null)
        .order('placed_at')

      setAvailable(avail || [])

      // My active orders
      const { data: mine } = await supabase
        .from('orders')
        .select('id, status, subtotal, total, delivery_fee, tip_amount, delivery_address, placed_at, stores(name, address)')
        .eq('shopper_id', profile.id)
        .in('status', ['shopping', 'in_transit'])
        .order('placed_at')

      setActive(mine || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Realtime: new orders appear instantly
  useEffect(() => {
    if (!approved) return
    const channel = supabase
      .channel('new-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
      }, () => load())
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
      toast.success(`Auftrag angenommen! Karte •••• ${data.cardLast4} erstellt (Limit: ${data.spendingLimit.toFixed(2)} €)`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAccepting(null)
    }
  }

  const revealCard = async (orderId: string) => {
    if (showCard === orderId) { setShowCard(null); return }
    if (cardDetails[orderId]) { setShowCard(orderId); return }

    try {
      const res = await fetch('/api/shopper/card-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCardDetails(prev => ({ ...prev, [orderId]: data }))
      setShowCard(orderId)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const markDelivered = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) { toast.error('Fehler'); return }
    toast.success('Lieferung abgeschlossen! 🎉 Ihr Verdienst wurde gutgeschrieben.')
    load()
  }

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num)
    toast.success('Kartennummer kopiert')
  }

  if (loading) return <div className="text-sm text-gray-400 p-8">Lädt...</div>

  if (!approved) {
    return (
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
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Aufträge</h1>
        <p className="text-sm text-gray-500 mt-1">
          {available.length} verfügbar · {active.length} aktiv
        </p>
      </div>

      {/* Active orders with card */}
      {active.length > 0 && (
        <>
          <h2 className="font-black text-sm text-gray-900 mb-3 uppercase tracking-wide">🛒 Meine aktiven Aufträge</h2>
          <div className="flex flex-col gap-4 mb-10">
            {active.map((order: any) => {
              const card = cardDetails[order.id]
              const revealed = showCard === order.id
              return (
                <div key={order.id} className="bg-white rounded-2xl border-2 border-orange/30 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-black text-gray-900">{order.stores?.name}</div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-light text-orange-dark capitalize">
                        {order.status === 'shopping' ? '🛒 Einkaufen' : '🚗 Unterwegs'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <MapPin size={13} /> {order.delivery_address?.street}, {order.delivery_address?.city}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      <span>Warenwert: <strong className="text-gray-900">{Number(order.subtotal).toFixed(2)} €</strong></span>
                      <span>Ihr Verdienst: <strong className="text-green-600">
                        {(Number(order.delivery_fee) * 0.8 + Number(order.tip_amount)).toFixed(2)} €
                      </strong></span>
                    </div>

                    {/* Virtual card */}
                    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#333] rounded-2xl p-5 mb-4 relative overflow-hidden">
                      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-red/20 blur-2xl" />
                      <div className="flex items-center justify-between mb-4 relative">
                        <div className="flex items-center gap-2">
                          <CreditCard size={18} className="text-orange" />
                          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Einkaufskarte</span>
                        </div>
                        <button onClick={() => revealCard(order.id)} className="text-white/50 hover:text-white transition-colors">
                          {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {revealed && card ? (
                        <>
                          <button
                            onClick={() => copyNumber(card.number)}
                            className="font-mono text-white text-lg tracking-widest mb-2 flex items-center gap-2 hover:text-orange transition-colors"
                          >
                            {card.number.replace(/(\d{4})/g, '$1 ').trim()}
                            <Copy size={13} className="text-white/40" />
                          </button>
                          <div className="flex gap-6 text-xs relative">
                            <div>
                              <div className="text-white/40 uppercase text-[9px] mb-0.5">Gültig bis</div>
                              <div className="text-white font-mono">{String(card.exp_month).padStart(2,'0')}/{String(card.exp_year).slice(-2)}</div>
                            </div>
                            <div>
                              <div className="text-white/40 uppercase text-[9px] mb-0.5">CVC</div>
                              <div className="text-white font-mono">{card.cvc}</div>
                            </div>
                            <div className="ml-auto text-right">
                              <div className="text-white/40 uppercase text-[9px] mb-0.5">Limit</div>
                              <div className="text-orange font-black">{card.spending_limit.toFixed(2)} €</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="font-mono text-white/50 text-lg tracking-widest relative">
                          •••• •••• •••• ••••
                          <div className="text-[10px] text-white/30 mt-2 font-sans tracking-normal">
                            Tippen Sie auf das Auge, um die Kartendaten anzuzeigen
                          </div>
                        </div>
                      )}
                    </div>

                    {order.status === 'shopping' && (
                      <button
                        onClick={async () => {
                          await supabase.from('orders').update({ status: 'in_transit' }).eq('id', order.id)
                          toast.success('Status: Unterwegs 🚗')
                          load()
                        }}
                        className="w-full bg-gray-900 text-white font-black rounded-xl py-3 text-sm hover:bg-black transition-colors mb-2"
                      >
                        Einkauf abgeschlossen → Unterwegs
                      </button>
                    )}
                    {order.status === 'in_transit' && (
                      <button
                        onClick={() => markDelivered(order.id)}
                        className="w-full bg-green-600 text-white font-black rounded-xl py-3 text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Lieferung bestätigen
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Available orders */}
      <h2 className="font-black text-sm text-gray-900 mb-3 uppercase tracking-wide">📦 Verfügbare Aufträge</h2>
      {available.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Keine verfügbaren Aufträge</p>
          <p className="text-sm text-gray-400">Neue Aufträge erscheinen hier automatisch in Echtzeit.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {available.map((order: any) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-black text-gray-900">{order.stores?.name}</div>
                <div className="text-right">
                  <div className="font-black text-green-600">
                    +{(Number(order.delivery_fee) * 0.8 + Number(order.tip_amount)).toFixed(2)} €
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase">Ihr Verdienst</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <MapPin size={13} /> {order.delivery_address?.street}, {order.delivery_address?.city}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <ShoppingCart size={12} /> Warenwert: {Number(order.subtotal).toFixed(2)} €
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {new Date(order.placed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={() => acceptOrder(order.id)}
                disabled={accepting === order.id}
                className="w-full bg-orange text-black font-black rounded-xl py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50"
              >
                {accepting === order.id ? 'Karte wird erstellt...' : 'Auftrag annehmen + Karte erhalten 💳'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
