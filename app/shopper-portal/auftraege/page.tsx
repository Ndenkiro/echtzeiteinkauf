'use client'
// app/shopper-portal/auftraege/page.tsx — missions filtered by shopper radius
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Package, MapPin, Clock, Euro, CheckCircle2, Loader2,
  MessageCircle, X, ShoppingCart, Truck, Lock, ArrowRight,
  Zap, Power, Settings, RefreshCw
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
  const [hasAddress, setHasAddress] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [radius, setRadius] = useState(20)
  const [assigned, setAssigned] = useState<any[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [chatOrder, setChatOrder] = useState<any>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async (silent = false) => {
    if (!silent) setRefreshing(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); setRefreshing(false); return }

    const { data: profile } = await supabase
      .from('users').select('id').eq('auth_id', user.id).maybeSingle()
    if (!profile) { setLoading(false); setRefreshing(false); return }
    setProfileId(profile.id)

    const { data: app } = await supabase
      .from('shopper_applications').select('status').eq('user_id', profile.id).maybeSingle()
    const ok = app?.status === 'approved'
    setApproved(ok)
    if (!ok) { setLoading(false); setRefreshing(false); return }

    // Address + availability
    const { data: s } = await supabase
      .from('shoppers').select('id, radius_km, address').eq('user_id', profile.id).maybeSingle()
    if (s) {
      setRadius(s.radius_km || 20)
      const { data: loc } = await supabase
        .from('shopper_locations').select('lat, lng, is_online').eq('shopper_id', s.id).maybeSingle()
      setHasAddress(!!loc?.lat)
      setIsOnline(!!loc?.is_online)
    }

    // My assigned missions
    const { data: mine } = await supabase
      .from('orders')
      .select('id, status, subtotal, delivery_fee, tip_amount, distance_km, is_peak_hour, placed_at, delivery_address, stores(name)')
      .eq('shopper_id', profile.id)
      .in('status', ['confirmed', 'shopping', 'in_transit'])
      .order('placed_at')
    setAssigned(mine || [])

    // Open missions within radius
    const { data: open } = await supabase.rpc('get_open_missions')
    setMissions(open || [])

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load(true) }, [])

  useEffect(() => {
    if (!approved) return
    const ch = supabase
      .channel('missions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load(true))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [approved])

  const toggleOnline = async () => {
    const next = !isOnline
    const { data, error } = await supabase.rpc('set_shopper_online', { p_online: next })
    if (error || !data?.ok) {
      toast.error(data?.reason === 'no_address'
        ? 'Bitte hinterlegen Sie zuerst Ihre Adresse im Profil'
        : 'Status konnte nicht geändert werden')
      return
    }
    setIsOnline(next)
    toast.success(next ? 'Sie sind online 🟢' : 'Sie sind offline')
    load(true)
  }

  const applyMission = async (orderId: string) => {
    setBusy(orderId)
    const { data, error } = await supabase.rpc('apply_to_mission', { p_order_id: orderId })
    setBusy(null)
    if (error || !data?.ok) {
      toast.error(
        data?.reason === 'already_taken' ? 'Dieser Auftrag wurde bereits vergeben'
        : data?.reason === 'not_approved' ? 'Ihr Konto ist noch nicht freigeschaltet'
        : 'Bewerbung fehlgeschlagen'
      )
      load(true)
      return
    }
    toast.success('Bewerbung eingereicht — Sie werden benachrichtigt')
    load(true)
  }

  const updateStatus = async (orderId: string, status: string) => {
    setBusy(orderId)
    const { error } = await supabase.from('orders').update({
      status,
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    }).eq('id', orderId)
    setBusy(null)
    if (error) { toast.error('Fehler'); return }
    toast.success(
      status === 'shopping'   ? 'Einkauf gestartet 🛒' :
      status === 'in_transit' ? 'Unterwegs 🚗' :
      'Geliefert! 🎉 Verdienst gutgeschrieben.'
    )
    load(true)
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
        <Link href="/shopper-portal/dokumente" className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
          Zu den Dokumenten <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Aufträge</h1>
          <p className="text-sm text-gray-500 mt-1">
            {assigned.length} zugewiesen · {missions.length} verfügbar im Umkreis von {radius} km
          </p>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl px-3 py-2 hover:border-orange hover:text-orange-dark transition-all"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Aktualisieren
        </button>
      </div>

      {/* No address yet */}
      {!hasAddress && (
        <div className="bg-orange-50 border-2 border-orange/30 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-orange/20 flex items-center justify-center flex-shrink-0">
            <MapPin size={20} className="text-orange-dark" />
          </div>
          <div className="flex-1">
            <h2 className="font-black text-gray-900 mb-1">Adresse fehlt</h2>
            <p className="text-sm text-gray-600 mb-4">
              Hinterlegen Sie Ihre Adresse, damit wir Ihnen Aufträge in Ihrer Nähe anzeigen können.
            </p>
            <Link
              href="/shopper-portal/profil"
              className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-5 py-2.5 text-sm hover:bg-orange-dark hover:text-white transition-colors"
            >
              <Settings size={15} /> Adresse hinterlegen
            </Link>
          </div>
        </div>
      )}

      {/* Offline */}
      {hasAddress && !isOnline && (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Power size={20} className="text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900">Sie sind offline</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Schalten Sie sich online, um Aufträge zu erhalten
            </div>
          </div>
          <button
            onClick={toggleOnline}
            className="bg-green-600 text-white font-black rounded-xl px-4 py-2.5 text-sm hover:bg-green-700 transition-colors flex-shrink-0"
          >
            Online gehen
          </button>
        </div>
      )}

      {/* Assigned */}
      {assigned.length > 0 && (
        <>
          <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">
            ✅ Ihnen zugewiesen
          </h2>
          <div className="flex flex-col gap-4 mb-10">
            {assigned.map((o: any) => {
              const net = calcNet(o.delivery_fee, o.tip_amount)
              return (
                <div key={o.id} className="bg-white rounded-2xl border-2 border-orange/40 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="font-black text-gray-900 truncate">{o.stores?.name}</div>
                      <div className="text-xs text-gray-400">
                        #{o.id.slice(0,8).toUpperCase()} ·{' '}
                        {new Date(o.placed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
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
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart size={12} /> {Number(o.subtotal).toFixed(2)} € Warenwert
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-xl p-3 mb-4 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Nettoverdienst</span>
                    <span className="font-black text-green-700">{net.toFixed(2)} €</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setChatOrder(o)}
                      className="border-2 border-gray-100 text-gray-600 rounded-xl px-4 py-2.5 hover:border-red hover:text-red transition-all flex-shrink-0"
                    >
                      <MessageCircle size={15} />
                    </button>
                    {o.status === 'confirmed' && (
                      <button onClick={() => updateStatus(o.id, 'shopping')} disabled={busy === o.id}
                        className="flex-1 bg-gray-900 text-white font-black rounded-xl py-2.5 text-sm hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {busy === o.id ? <Loader2 size={15} className="animate-spin" /> : <><ShoppingCart size={15} /> Einkauf starten</>}
                      </button>
                    )}
                    {o.status === 'shopping' && (
                      <button onClick={() => updateStatus(o.id, 'in_transit')} disabled={busy === o.id}
                        className="flex-1 bg-gray-900 text-white font-black rounded-xl py-2.5 text-sm hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {busy === o.id ? <Loader2 size={15} className="animate-spin" /> : <><Truck size={15} /> Unterwegs</>}
                      </button>
                    )}
                    {o.status === 'in_transit' && (
                      <button onClick={() => updateStatus(o.id, 'delivered')} disabled={busy === o.id}
                        className="flex-1 bg-green-600 text-white font-black rounded-xl py-2.5 text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {busy === o.id ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> Geliefert</>}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Open missions */}
      <h2 className="font-black text-xs text-gray-500 uppercase tracking-wide mb-3">
        📬 Verfügbare Aufträge
      </h2>

      {!hasAddress ? null : missions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={36} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Keine Aufträge im Umkreis von {radius} km</p>
          <p className="text-sm text-gray-400 mb-5">
            Neue Aufträge erscheinen hier automatisch, sobald ein Kunde in Ihrer Nähe bestellt.
          </p>
          <Link href="/shopper-portal/profil" className="text-xs font-bold text-orange-dark hover:underline">
            Radius im Profil ändern →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {missions.map((m: any) => (
            <div key={m.order_id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="font-black text-gray-900 truncate">{m.store_name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {m.street}{m.city ? `, ${m.city}` : ''}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-green-600">{Number(m.net_earning).toFixed(2)} €</div>
                  <div className="text-[10px] text-gray-400 uppercase">Netto</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-gray-600">
                  <MapPin size={11} /> {Number(m.distance_km).toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <Euro size={11} /> {Number(m.subtotal).toFixed(2)} €
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(m.placed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {Number(m.tip_amount) > 0 && (
                  <span className="text-orange-dark font-bold">
                    +{Number(m.tip_amount).toFixed(2)} € Trinkgeld
                  </span>
                )}
                {m.is_peak_hour && (
                  <span className="flex items-center gap-1 text-orange-dark font-bold">
                    <Zap size={11} /> Stoßzeit
                  </span>
                )}
              </div>

              <button
                onClick={() => applyMission(m.order_id)}
                disabled={m.has_applied || busy === m.order_id}
                className={`w-full font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors ${
                  m.has_applied
                    ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
                    : 'bg-orange text-black hover:bg-orange-dark hover:text-white'
                }`}
              >
                {busy === m.order_id ? <Loader2 size={15} className="animate-spin" />
                  : m.has_applied ? <><CheckCircle2 size={15} /> Beworben</>
                  : 'Bewerben'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
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
