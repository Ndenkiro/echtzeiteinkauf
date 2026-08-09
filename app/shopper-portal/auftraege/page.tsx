'use client'
// app/shopper-portal/auftraege/page.tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Package, MapPin, Clock, Euro, CheckCircle2, Loader2,
  MessageCircle, X, Lock, ArrowRight, Power, Settings, RefreshCw,
  Zap, AlertCircle
} from 'lucide-react'
import { OrderChat } from '@/components/chat/order-chat'
import { MissionActions } from '@/components/shopper/mission-actions'
import { LocationSearch, type SearchLocation } from '@/components/shopper/location-search'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const net = (c: number, t: number) =>
  Math.round(((Number(c) + Number(t || 0)) * 0.9) * 100) / 100

export default function AuftraegePage() {
  const [profileId, setProfileId] = useState<string | null>(null)
  const [approved, setApproved] = useState<boolean | null>(null)
  const [hasAddress, setHasAddress] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [homeRadius, setHomeRadius] = useState(20)
  const [searchLoc, setSearchLoc] = useState<SearchLocation>(null)
  const [assigned, setAssigned] = useState<any[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [chatOrder, setChatOrder] = useState<any>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const loadMissions = async (loc: SearchLocation) => {
    const { data } = await supabase.rpc('get_open_missions', {
      p_lat: loc?.lat ?? null,
      p_lng: loc?.lng ?? null,
      p_radius: loc?.radius ?? null,
    })
    setMissions(data || [])
  }

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

    const { data: s } = await supabase
      .from('shoppers').select('id, radius_km').eq('user_id', profile.id).maybeSingle()
    if (s) {
      setHomeRadius(s.radius_km || 20)
      const { data: loc } = await supabase
        .from('shopper_locations').select('lat, is_online').eq('shopper_id', s.id).maybeSingle()
      setHasAddress(!!loc?.lat)
      setIsOnline(!!loc?.is_online)
    }

    const { data: mine } = await supabase
      .from('orders')
      .select('id, status, subtotal, commission, delivery_fee, tip_amount, distance_km, placed_at, delivery_address, receipt_url, stores(name)')
      .eq('shopper_id', profile.id)
      .in('status', ['confirmed', 'shopping', 'in_transit'])
      .order('placed_at')
    setAssigned(mine || [])

    await loadMissions(searchLoc)
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load(true) }, [])

  // Re-query when the search location changes
  useEffect(() => {
    if (approved) loadMissions(searchLoc)
  }, [searchLoc, approved])

  useEffect(() => {
    if (!approved) return
    const ch = supabase.channel('missions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
          () => loadMissions(searchLoc))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [approved, searchLoc])

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
  }

  const claim = async (orderId: string) => {
    setBusy(orderId)
    const { data, error } = await supabase.rpc('claim_mission', { p_order_id: orderId })
    setBusy(null)

    if (error || !data?.ok) {
      const reason = data?.reason
      toast.error(
        reason === 'already_taken' ? 'Zu spät — ein anderer Shopper war schneller'
        : reason === 'already_busy' ? 'Sie haben bereits einen aktiven Auftrag'
        : reason === 'not_approved' ? 'Ihr Konto ist noch nicht freigeschaltet'
        : 'Auftrag konnte nicht übernommen werden'
      )
      load(true)
      return
    }
    toast.success('Auftrag übernommen! 🎉')
    load(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!approved) return (
    <div className="max-w-lg">
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-orange/15 flex items-center justify-center mx-auto mb-5">
          <Lock size={26} className="text-orange" />
        </div>
        <h1 className="font-black text-xl text-white mb-2">Noch nicht freigeschaltet</h1>
        <p className="text-sm text-white/50 mb-6">Reichen Sie Ihre Dokumente ein.</p>
        <Link href="/shopper-portal/dokumente"
          className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
          Zu den Dokumenten <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Aufträge</h1>
          <p className="text-sm text-white/40 mt-1">
            {assigned.length} aktiv · {missions.length} verfügbar
          </p>
        </div>
        <button onClick={() => load()} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-bold text-white/50 border border-white/15 rounded-xl px-3 py-2 hover:border-orange hover:text-orange transition-all">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Aktualisieren
        </button>
      </div>

      {/* Online toggle */}
      {hasAddress && !isOnline && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            <Power size={18} className="text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm text-white">Sie sind offline</div>
            <div className="text-[11px] text-white/40">Nur online erhalten Sie automatisch Aufträge</div>
          </div>
          <button onClick={toggleOnline}
            className="bg-green-600 text-white font-black rounded-xl px-4 py-2.5 text-sm hover:bg-green-700 transition-colors flex-shrink-0">
            Online gehen
          </button>
        </div>
      )}

      {/* Active missions */}
      {assigned.length > 0 && (
        <>
          <h2 className="font-black text-xs text-white/40 uppercase tracking-wide mb-3">
            🛒 Aktive Aufträge
          </h2>
          <div className="flex flex-col gap-4 mb-8">
            {assigned.map((o: any) => {
              const c = Number(o.commission ?? o.delivery_fee)
              return (
                <div key={o.id} className="bg-white/[0.04] rounded-2xl border-2 border-orange/40 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="font-black text-white truncate">{o.stores?.name}</div>
                      <div className="text-xs text-white/40">
                        #{o.id.slice(0,8).toUpperCase()} ·{' '}
                        {new Date(o.placed_at).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange/20 text-orange flex-shrink-0">
                      {o.status === 'confirmed' ? 'Neu' : o.status === 'shopping' ? '🛒 Einkaufen' : '🚗 Unterwegs'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-white/50 mb-3">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span className="truncate">{o.delivery_address?.street}</span>
                  </div>

                  <div className="bg-green-500/10 rounded-xl p-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/50">Nettoverdienst</span>
                      <span className="font-black text-green-400 text-lg">
                        {net(c, o.tip_amount).toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  <button onClick={() => setChatOrder(o)}
                    className="w-full flex items-center justify-center gap-2 border border-white/15 text-white/70 font-bold rounded-xl py-2.5 text-sm hover:border-orange hover:text-orange transition-all mb-2">
                    <MessageCircle size={15} /> Chat mit Kunde
                  </button>

                  <MissionActions order={o} onDone={() => load(true)} />
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Location search */}
      <div className="mb-3">
        <h2 className="font-black text-xs text-white/40 uppercase tracking-wide">📬 Verfügbare Aufträge</h2>
        <p className="text-[11px] text-white/30 mt-1">Wer zuerst übernimmt, bekommt den Auftrag.</p>
      </div>

      <LocationSearch homeRadius={homeRadius} value={searchLoc} onChange={setSearchLoc} />

      {!hasAddress && !searchLoc && (
        <div className="bg-orange/10 border border-orange/30 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <MapPin size={18} className="text-orange flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-black text-sm text-white mb-1">Noch keine Adresse hinterlegt</div>
            <p className="text-xs text-white/60 mb-3">
              Suchen Sie oben nach einem Ort oder hinterlegen Sie Ihre Adresse dauerhaft im Profil.
            </p>
            <Link href="/shopper-portal/profil"
              className="inline-flex items-center gap-1.5 text-xs font-black text-orange hover:underline">
              <Settings size={13} /> Zum Profil
            </Link>
          </div>
        </div>
      )}

      {assigned.length > 0 && missions.length > 0 && (
        <div className="bg-orange/10 border border-orange/30 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={17} className="text-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/70 leading-relaxed">
            Sie haben bereits einen aktiven Auftrag. Schließen Sie ihn ab,
            um einen neuen übernehmen zu können.
          </p>
        </div>
      )}

      {missions.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center">
          <Package size={34} className="text-white/20 mx-auto mb-4" />
          <p className="font-bold text-white mb-1">
            Keine Aufträge {searchLoc ? `im Umkreis von ${searchLoc.radius} km` : 'gefunden'}
          </p>
          <p className="text-sm text-white/40">
            Suchen Sie an einem anderen Ort oder vergrößern Sie den Umkreis.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {missions.map((m: any) => (
            <div key={m.order_id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:border-orange/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="font-black text-white truncate">{m.store_name}</div>
                  <div className="text-xs text-white/40 truncate">
                    {m.street}{m.city ? `, ${m.city}` : ''}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-green-400 text-lg">
                    {Number(m.net_earning).toFixed(2)} €
                  </div>
                  <div className="text-[10px] text-white/30 uppercase">Netto</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-white/40 mb-3 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-orange">
                  <MapPin size={11} /> {Number(m.distance_km).toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <Package size={11} /> {m.item_count} Artikel
                </span>
                <span className="flex items-center gap-1">
                  <Euro size={11} /> {Number(m.subtotal).toFixed(2)} €
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(m.placed_at).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })}
                </span>
              </div>

              <button onClick={() => claim(m.order_id)}
                disabled={busy !== null || assigned.length > 0}
                className="w-full font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors bg-orange text-black hover:bg-orange-dark hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                {busy === m.order_id
                  ? <><Loader2 size={15} className="animate-spin" /> Wird übernommen…</>
                  : <><Zap size={15} /> Auftrag übernehmen</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {chatOrder && profileId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setChatOrder(null)} />
          <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900">Chat mit Kunde</h2>
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
