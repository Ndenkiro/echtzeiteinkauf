'use client'
// app/shopper-portal/auftraege/page.tsx — assigned + open missions
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import {
  Package, MapPin, Clock, Euro, CheckCircle2, Loader2,
  MessageCircle, X, ShoppingCart, Truck, Lock, ArrowRight, Zap
} from 'lucide-react'
import { OrderChat } from '@/components/chat/order-chat'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const calcNet = (fee: number, tip: number) => {
  const gross = Number(fee) * 0.8 + Number(tip || 0)
  return Math.round((gross - gross * 0.1) * 100) / 100
}

export default function AuftraegePage() {
  const [profileId, setProfileId] = useState<string | null>(null)
  const [approved, setApproved] = useState<boolean | null>(null)
  const [assigned, setAssigned] = useState<any[]>([])
  const [open, setOpen] = useState<any[]>([])
  const [appliedIds, setAppliedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [chatOrder, setChatOrder] = useState<any>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: profile } = await supabase
      .from('users').select('id').eq('auth_id', user.id).maybeSingle()
    if (!profile) { setLoading(false); return }
    setProfileId(profile.id)

    const { data: app } = await supabase
      .from('shopper_applications').select('status').eq('user_id', profile.id).maybeSingle()
    const ok = app?.status === 'approved'
    setApproved(ok)
    if (!ok) { setLoading(false); return }

    // Missions assigned to me
    const { data: mine } = await supabase
      .from('orders')
      .select('id, status, subtotal, total, delivery_fee, tip_amount, distance_km, is_peak_hour, placed_at, delivery_address, stores(name, address)')
      .eq('shopper_id', profile.id)
      .in('status', ['confirmed', 'shopping', 'in_transit'])
      .order('placed_at')
    setAssigned(mine || [])

    // Orders where I'm a candidate but not selected
    const { data: apps } = await supabase
      .from('shopper_order_applications')
      .select('order_id, status')
      .eq('shopper_id', profile.id)
      .eq('status', 'pending')

    const ids = (apps || []).map(a => a.order_id)
    setAppliedIds(ids)

    if (ids.length) {
      const { data: openOrders } = await supabase
        .from('orders')
        .select('id, status, subtotal, delivery_fee, tip_amount, distance_km, is_peak_hour, placed_at, delivery_address, stores(name)')
        .in('id', ids)
        .in('status', ['pending', 'confirmed'])
        .neq('shopper_id', profile.id)
      setOpen(openOrders || [])
    } else {
      setOpen([])
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Realtime
  useEffect(() => {
    if (!approved) return
    const ch = supabase
      .channel('shopper-missions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopper_order_applications' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [approved])

  const updateStatus = async (orderId: string, status: string) => {
    setBusy(orderId)
    const { error } = await supabase.from('orders').update({
      status,
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    setBusy(null)
    if (error) { toast.error('Fehler beim Aktualisieren'); return }
    toast.success(
      status === 'shopping'   ? 'Einkauf gestartet 🛒' :
      status === 'in_transit' ? 'Unterwegs zum Kunden 🚗' :
      'Lieferung bestätigt! 🎉 Verdienst gutgeschrieben.'
    )
    load()
  }

  const apply = async (orderId: string) => {
    setBusy(orderId)
    const { error } = await supabase
      .from('shopper_order_applications')
      .upsert({ order_id: orderId, shopper_id: profileId, status: 'pending' })
    setBusy(null)
    if (error) { toast.error('Bewerbung fehlgeschlagen'); return }
    toast.success('Bewerbung eingereicht — Sie werden benachrichtigt')
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!approved) return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-orange/15 flex items-center justify-center mx-auto mb-5">
          <Lock size={26} className="text-orange-dark" />
        </div>
        <h1 className="font-black text-xl text-gray-900 mb-2">Noch nicht freigeschaltet</h1>
        <p className="text-sm text-gray-500 mb-6">Reichen Sie Ihre Dokumente ein, um Aufträge zu erhalten.</p>
        <a href="/shopper-portal/dokumente" className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
          Zu den Dokumenten <ArrowRight size={15} />
        </a>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Aufträge</h1>
        <p className="text-sm text-gray-500 mt-1">
          {assigned.length} zugewiesen · {open.length} offen
        </p>
      </div>

      {/* ── Assigned missions ── */}
      {assigned.length > 0 && (
        <>
          <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">
            ✅ Ihnen zugewiesen
          </h2>
          <div className="flex flex-col gap-4 mb-10">
            {assigned.map((o: any) => {
              const net = calcNet(o.delivery_fee, o.tip_amount)
              return (
                <div key={o.id} className="bg-white rounded-2xl border-2 border-orange/40 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="font-black text-gray-900 truncate">{o.stores?.name}</div>
                        <div className="text-xs text-gray-400">
                          #{o.id.slice(0,8).toUpperCase()} · {new Date(o.placed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-light text-orange-dark flex-shrink-0">
                        {o.status === 'confirmed' ? 'Neu' : o.status === 'shopping' ? '🛒 Einkaufen' : '🚗 Unterwegs'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{o.delivery_address?.street}</span>
                        {o.distance_km && <span className="flex-shrink-0">· {o.distance_km} km</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart size={12} /> Warenwert: {Number(o.subtotal).toFixed(2)} €
                        {o.is_peak_hour && (
                          <span className="ml-1 text-orange-dark font-bold flex items-center gap-1">
                            <Zap size={10} /> Stoßzeit
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Earnings */}
                    <div className="bg-green-50 rounded-xl p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Ihr Nettoverdienst</span>
                        <span className="font-black text-green-700">{net.toFixed(2)} €</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {(Number(o.delivery_fee) * 0.8).toFixed(2)} € Lieferanteil
                        {Number(o.tip_amount) > 0 && ` + ${Number(o.tip_amount).toFixed(2)} € Trinkgeld`}
                        {' '}− 10 % Plattformgebühr
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setChatOrder(o)}
                        className="flex items-center justify-center gap-1.5 border-2 border-gray-100 text-gray-600 font-bold rounded-xl px-4 py-2.5 text-sm hover:border-red hover:text-red transition-all flex-shrink-0"
                      >
                        <MessageCircle size={15} />
                      </button>

                      {o.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(o.id, 'shopping')}
                          disabled={busy === o.id}
                          className="flex-1 bg-gray-900 text-white font-black rounded-xl py-2.5 text-sm hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {busy === o.id ? <Loader2 size={15} className="animate-spin" /> : <><ShoppingCart size={15} /> Einkauf starten</>}
                        </button>
                      )}
                      {o.status === 'shopping' && (
                        <button
                          onClick={() => updateStatus(o.id, 'in_transit')}
                          disabled={busy === o.id}
                          className="flex-1 bg-gray-900 text-white font-black rounded-xl py-2.5 text-sm hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {busy === o.id ? <Loader2 size={15} className="animate-spin" /> : <><Truck size={15} /> Unterwegs</>}
                        </button>
                      )}
                      {o.status === 'in_transit' && (
                        <button
                          onClick={() => updateStatus(o.id, 'delivered')}
                          disabled={busy === o.id}
                          className="flex-1 bg-green-600 text-white font-black rounded-xl py-2.5 text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {busy === o.id ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> Geliefert</>}
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

      {/* ── Open missions ── */}
      <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">
        📬 Offene Aufträge in Ihrer Nähe
      </h2>
      {open.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={36} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Keine offenen Aufträge</p>
          <p className="text-sm text-gray-400">
            Sie werden per E-Mail benachrichtigt, sobald ein Auftrag in Ihrer Nähe eingeht.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((o: any) => {
            const net = calcNet(o.delivery_fee, o.tip_amount)
            const hasApplied = appliedIds.includes(o.id)
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-black text-gray-900 truncate">{o.stores?.name}</div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-green-600">{net.toFixed(2)} €</div>
                    <div className="text-[10px] text-gray-400 uppercase">Netto</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
                  {o.distance_km && <span className="flex items-center gap-1"><MapPin size={11} /> {o.distance_km} km</span>}
                  <span className="flex items-center gap-1"><Euro size={11} /> {Number(o.subtotal).toFixed(2)} €</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {new Date(o.placed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {o.is_peak_hour && (
                    <span className="flex items-center gap-1 text-orange-dark font-bold">
                      <Zap size={11} /> Stoßzeit
                    </span>
                  )}
                </div>
                <button
                  onClick={() => apply(o.id)}
                  disabled={hasApplied || busy === o.id}
                  className={`w-full font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors ${
                    hasApplied
                      ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                      : 'bg-orange text-black hover:bg-orange-dark hover:text-white'
                  }`}
                >
                  {busy === o.id ? <Loader2 size={15} className="animate-spin" />
                    : hasApplied ? <><CheckCircle2 size={15} /> Beworben — warte auf Auswahl</>
                    : 'Für diesen Auftrag bewerben'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Chat drawer */}
      {chatOrder && profileId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setChatOrder(null)} />
          <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">Chat mit Kunde</h2>
                <p className="text-xs text-gray-400">{chatOrder.stores?.name}</p>
              </div>
              <button onClick={() => setChatOrder(null)} className="w-8 h-8 rounded-xl border border-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <OrderChat orderId={chatOrder.id} myRole="shopper" myUserId={profileId} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
