'use client'
// app/shopper-portal/page.tsx — live overview + activity feed
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  Wallet, TrendingUp, Package, Star, Clock, Lock, ArrowRight,
  ShoppingCart, Truck, CheckCircle2, MapPin, MessageCircle,
  AlertTriangle, Receipt, ChevronRight, Zap, Route, Award
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const STEP_CFG: Record<string, { label: string; icon: any; color: string }> = {
  confirmed:  { label: 'Auftrag angenommen', icon: CheckCircle2, color: 'text-blue-400' },
  shopping:   { label: 'Einkauf läuft',      icon: ShoppingCart, color: 'text-orange' },
  in_transit: { label: 'Unterwegs',          icon: Truck,        color: 'text-purple-400' },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'gerade eben'
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`
  const d = Math.floor(diff / 86400)
  if (d === 1) return 'gestern'
  if (d < 7) return `vor ${d} Tagen`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export default function ShopperDashboard() {
  const [approved, setApproved] = useState<boolean | null>(null)
  const [appStatus, setAppStatus] = useState('draft')
  const [mission, setMission] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('users').select('id, full_name').eq('auth_id', user.id).maybeSingle()
    if (!profile) { setLoading(false); return }
    setName(profile.full_name || '')

    const { data: app } = await supabase
      .from('shopper_applications').select('status').eq('user_id', profile.id).maybeSingle()
    setAppStatus(app?.status || 'draft')
    const ok = app?.status === 'approved'
    setApproved(ok)
    if (!ok) { setLoading(false); return }

    const [{ data: m }, { data: a }, { data: s }] = await Promise.all([
      supabase.rpc('get_my_current_mission'),
      supabase.rpc('get_my_activity', { p_limit: 12 }),
      supabase.rpc('get_my_stats'),
    ])
    setMission(m?.[0] ?? null)
    setActivity(a || [])
    setStats(s?.[0] ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Live refresh
  useEffect(() => {
    if (!approved) return
    const ch = supabase.channel('shopper-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => load())
      .subscribe()
    const t = setInterval(load, 30000)
    return () => { supabase.removeChannel(ch); clearInterval(t) }
  }, [approved])

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
        <p className="text-sm text-white/50 mb-6">
          {appStatus === 'under_review'
            ? 'Ihre Bewerbung wird geprüft. Wir melden uns in 2–3 Werktagen.'
            : 'Reichen Sie Ihre Dokumente ein, um als Shopper zu starten.'}
        </p>
        <Link href="/shopper-portal/dokumente"
          className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
          Zu den Dokumenten <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )

  const step = mission ? STEP_CFG[mission.status] : null
  const StepIcon = step?.icon
  const minutesLeft = mission?.minutes_left ?? 0
  const urgent = minutesLeft < 30
  const warn = minutesLeft < 60
  const itemsDone = mission ? Number(mission.picked_items) + Number(mission.missing_items) : 0
  const itemsTotal = mission ? Number(mission.total_items) : 0
  const itemPct = itemsTotal > 0 ? Math.round((itemsDone / itemsTotal) * 100) : 0

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-white">
          Hallo {name.split(' ')[0] || 'Shopper'} 👋
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {mission ? 'Sie haben einen laufenden Auftrag' : 'Bereit für den nächsten Auftrag'}
        </p>
      </div>

      {/* ── Live mission ── */}
      {mission ? (
        <div className="bg-white/[0.04] border-2 border-orange/40 rounded-2xl overflow-hidden mb-7">
          <div className="px-5 py-4 flex items-center gap-3 border-b border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
              {StepIcon && <StepIcon size={19} className="text-orange" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-white truncate">{mission.store_name}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                </span>
              </div>
              <div className={`text-xs ${step?.color || 'text-white/40'}`}>
                {step?.label}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-black text-green-400">
                {Number(mission.net_earning).toFixed(2)} €
              </div>
              <div className="text-[10px] text-white/30 uppercase">Netto</div>
            </div>
          </div>

          <div className="p-5">
            {/* Address */}
            <div className="flex items-center gap-2 text-xs text-white/50 mb-4">
              <MapPin size={13} className="flex-shrink-0" />
              <span className="truncate">
                {mission.street}{mission.city ? `, ${mission.city}` : ''}
              </span>
              {mission.distance_km && (
                <span className="text-orange font-bold flex-shrink-0">
                  · {Number(mission.distance_km).toFixed(1)} km
                </span>
              )}
            </div>

            {/* Shopping progress */}
            {mission.status === 'shopping' && itemsTotal > 0 && (
              <div className="bg-white/[0.04] rounded-xl p-3.5 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                    <ShoppingCart size={12} /> Einkaufsfortschritt
                  </span>
                  <span className={`text-sm font-black ${
                    itemPct === 100 ? 'text-green-400' : 'text-orange'
                  }`}>{itemPct}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${
                    itemPct === 100 ? 'bg-green-500' : 'bg-orange'
                  }`} style={{ width: `${itemPct}%` }} />
                </div>
                <div className="text-[11px] text-white/40">
                  {mission.picked_items} eingekauft
                  {Number(mission.missing_items) > 0 && ` · ${mission.missing_items} nicht verfügbar`}
                  {' · '}{itemsTotal - itemsDone} offen
                </div>
              </div>
            )}

            {/* Receipt done */}
            {mission.has_receipt && (
              <div className="flex items-center gap-2 bg-green-500/10 rounded-xl px-3 py-2 mb-3 text-[11px] text-green-400">
                <Receipt size={12} /> Kassenbon hochgeladen
              </div>
            )}

            {/* Countdown */}
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-[11px] ${
              urgent ? 'bg-red-500/15 text-red-400'
              : warn ? 'bg-orange/15 text-orange'
              : 'bg-white/[0.05] text-white/50'
            }`}>
              {urgent ? <AlertTriangle size={12} /> : <Clock size={12} />}
              <span className="font-bold">
                {minutesLeft >= 60
                  ? `Noch ${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}min`
                  : `Noch ${minutesLeft} Minuten`}
              </span>
              <span className="opacity-70">bis zur automatischen Freigabe</span>
            </div>

            <Link href="/shopper-portal/auftraege"
              className="w-full flex items-center justify-center gap-2 bg-orange text-black font-black rounded-xl py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
              {mission.status === 'confirmed' ? 'Einkauf starten'
                : mission.status === 'shopping' ? 'Zur Einkaufsliste'
                : 'Lieferung abschließen'}
              <ChevronRight size={15} />
            </Link>

            {Number(mission.unread_messages) > 0 && (
              <Link href="/shopper-portal/auftraege"
                className="w-full flex items-center justify-center gap-2 mt-2 text-xs font-bold text-orange">
                <MessageCircle size={13} />
                {mission.unread_messages} neue Nachricht{Number(mission.unread_messages) > 1 ? 'en' : ''}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <Link href="/shopper-portal/auftraege"
          className="block bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-7 hover:border-orange/40 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange/15 flex items-center justify-center flex-shrink-0">
              <Zap size={22} className="text-orange" />
            </div>
            <div className="flex-1">
              <div className="font-black text-white">Kein laufender Auftrag</div>
              <div className="text-sm text-white/40 mt-0.5">
                Verfügbare Aufträge in Ihrer Nähe ansehen
              </div>
            </div>
            <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {[
            { label: 'Heute',      value: `${Number(stats.today_earned).toFixed(2)} €`, sub: `${stats.today_count} Touren`, icon: Wallet,     color: 'text-green-400 bg-green-500/15' },
            { label: 'Diese Woche',value: `${Number(stats.week_earned).toFixed(2)} €`,  sub: `${stats.week_count} Touren`,  icon: TrendingUp, color: 'text-blue-400 bg-blue-500/15' },
            { label: 'Gesamt',     value: stats.total_count,                            sub: 'Lieferungen',                 icon: Package,    color: 'text-purple-400 bg-purple-500/15' },
            { label: 'Bewertung',  value: stats.avg_rating ? `${Number(stats.avg_rating).toFixed(1)} ⭐` : '—', sub: `${Number(stats.total_km).toFixed(0)} km`, icon: Award, color: 'text-orange bg-orange/15' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${s.color}`}>
                  <Icon size={16} />
                </div>
                <div className="text-lg font-black text-white">{s.value}</div>
                <div className="text-[11px] font-bold text-white/40 mt-0.5">{s.label}</div>
                <div className="text-[10px] text-white/25">{s.sub}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Activity feed ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-xs text-white/40 uppercase tracking-wide">
          Letzte Aktivitäten
        </h2>
        <Link href="/shopper-portal/historie" className="text-[11px] font-bold text-orange hover:underline">
          Alle ansehen →
        </Link>
      </div>

      {activity.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-10 text-center">
          <Route size={30} className="text-white/20 mx-auto mb-3" />
          <p className="font-bold text-white mb-1">Noch keine Aktivitäten</p>
          <p className="text-sm text-white/40">
            Ihre Aufträge und Bewertungen erscheinen hier.
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl divide-y divide-white/[0.06]">
          {activity.map((a: any, i: number) => {
            const cfg =
              a.kind === 'delivered' ? { icon: CheckCircle2, color: 'text-green-400 bg-green-500/15', label: 'Geliefert' }
              : a.kind === 'accepted' ? { icon: Zap,         color: 'text-orange bg-orange/15',       label: 'Angenommen' }
              : { icon: Star, color: 'text-yellow-400 bg-yellow-500/15', label: 'Bewertung erhalten' }
            const Icon = cfg.icon
            return (
              <div key={`${a.kind}-${a.order_id}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {cfg.label} · {a.store_name}
                  </div>
                  <div className="text-[11px] text-white/35 flex items-center gap-1.5">
                    {a.happened_at && timeAgo(a.happened_at)}
                    {a.detail && <span className="truncate">· {a.detail}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {a.amount != null && (
                    <div className="font-black text-sm text-green-400">
                      +{Number(a.amount).toFixed(2)} €
                    </div>
                  )}
                  {a.stars != null && (
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={10}
                          className={s <= a.stars ? 'fill-orange text-orange' : 'fill-white/10 text-white/10'} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
