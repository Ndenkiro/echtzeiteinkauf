'use client'
// components/shopper/public-missions.tsx — mission preview for visitors
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  Package, MapPin, Euro, Clock, Search, Navigation,
  Loader2, Lock, ArrowRight, TrendingUp, X
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

const RADIUS = [10, 20, 50]

export function PublicMissions() {
  const [missions, setMissions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [radius, setRadius] = useState(20)
  const [place, setPlace] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [gate, setGate] = useState<any>(null)   // mission the visitor tried to take

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async (loc: typeof place, r: number) => {
    const { data } = await supabase.rpc('get_public_missions', {
      p_lat: loc?.lat ?? null,
      p_lng: loc?.lng ?? null,
      p_radius: r,
      p_limit: 12,
    })
    setMissions(data || [])
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_public_stats')
      setStats(data)
      load(null, radius)
    })()
  }, [])

  const searchPlace = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', Deutschland')}&region=DE&key=${GOOGLE_MAPS_API_KEY}`
      )
      const d = await res.json()
      setSearching(false)
      if (d.status !== 'OK' || !d.results?.[0]) { toast.error('Ort nicht gefunden'); return }
      const l = d.results[0].geometry.location
      const p = { lat: l.lat, lng: l.lng, label: d.results[0].formatted_address.replace(', Deutschland', '') }
      setPlace(p)
      setLoading(true)
      load(p, radius)
    } catch { setSearching(false) }
  }

  const useGps = () => {
    if (!navigator.geolocation) return
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Ihr Standort' }
        setPlace(p); setSearching(false); setLoading(true)
        load(p, radius)
      },
      () => { setSearching(false); toast.error('Standortzugriff verweigert') }
    )
  }

  const changeRadius = (r: number) => {
    setRadius(r); setLoading(true); load(place, r)
  }

  const clearPlace = () => {
    setPlace(null); setQuery(''); setLoading(true); load(null, radius)
  }

  return (
    <section id="missionen" className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
      <div className="flex items-end justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white">Aktuelle Aufträge</h2>
          <p className="text-white/50 text-sm mt-1">
            Echte Aufträge, die gerade auf einen Shopper warten.
          </p>
        </div>
        {stats?.open_missions > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-black text-green-400 bg-green-500/10 px-3 py-2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {stats.open_missions} offen
          </div>
        )}
      </div>

      {/* Live stats */}
      {stats && stats.open_missions > 0 && (
        <div className="grid grid-cols-3 gap-3 my-6">
          {[
            { v: `${Number(stats.avg_earning || 0).toFixed(2)} €`, l: 'Ø Verdienst' },
            { v: `${Number(stats.max_earning || 0).toFixed(2)} €`, l: 'Bester Auftrag' },
            { v: stats.active_shoppers ?? 0,                        l: 'Shopper online' },
          ].map(s => (
            <div key={s.l} className="bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3">
              <div className="text-lg font-black text-orange">{s.v}</div>
              <div className="text-[10px] text-white/40 font-bold uppercase tracking-wide mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-orange transition-colors">
          <Search size={16} className="text-white/30 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchPlace()}
            placeholder="Stadt oder PLZ — z.B. Nürnberg"
            className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/30"
          />
          {place && (
            <button onClick={clearPlace}><X size={14} className="text-white/30 hover:text-white" /></button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={searchPlace} disabled={searching || !query.trim()}
            className="flex-1 sm:flex-none bg-orange text-black font-black rounded-2xl px-5 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-40">
            {searching ? <Loader2 size={15} className="animate-spin" /> : 'Suchen'}
          </button>
          <button onClick={useGps} disabled={searching} title="Mein Standort"
            className="w-12 border border-white/15 rounded-2xl flex items-center justify-center text-white/60 hover:border-orange hover:text-orange transition-all">
            <Navigation size={16} />
          </button>
        </div>
      </div>

      {/* Radius */}
      {place && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-white/40 font-bold">
            <MapPin size={11} className="inline mr-1" />{place.label} ·
          </span>
          {RADIUS.map(r => (
            <button key={r} onClick={() => changeRadius(r)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                radius === r ? 'bg-orange text-black' : 'bg-white/[0.06] text-white/50 hover:text-white'
              }`}>{r} km</button>
          ))}
        </div>
      )}

      {/* Missions */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : missions.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center">
          <Package size={34} className="text-white/20 mx-auto mb-4" />
          <p className="font-bold text-white mb-1">
            {place ? `Aktuell keine Aufträge im Umkreis von ${radius} km` : 'Gerade keine offenen Aufträge'}
          </p>
          <p className="text-sm text-white/40 mb-6">
            Als registrierter Shopper werden Sie sofort benachrichtigt, sobald ein Auftrag eingeht.
          </p>
          <Link href="/registrieren"
            className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
            Jetzt registrieren <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {missions.map((m: any) => (
              <button
                key={m.order_id}
                onClick={() => setGate(m)}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 text-left hover:border-orange/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-black text-white truncate">{m.store_name}</div>
                    <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {m.city}
                      {m.distance_km != null && ` · ${Number(m.distance_km).toFixed(1)} km`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-green-400 text-lg">
                      {Number(m.net_earning).toFixed(2)} €
                    </div>
                    <div className="text-[9px] text-white/30 uppercase font-bold">Ihr Verdienst</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-white/40 mb-3">
                  <span className="flex items-center gap-1">
                    <Package size={10} /> {m.item_count} Artikel
                  </span>
                  <span className="flex items-center gap-1">
                    <Euro size={10} /> {Number(m.subtotal).toFixed(2)} €
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(m.placed_at).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 border border-white/10 rounded-xl py-2 text-xs font-black text-white/60 group-hover:border-orange group-hover:text-orange transition-all">
                  <Lock size={12} /> Auftrag annehmen
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-white/30 mt-6">
            Adressen und Kundendaten sind erst nach der Freischaltung sichtbar.
          </p>
        </>
      )}

      {/* Login gate */}
      {gate && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6"
             onClick={() => setGate(null)}>
          <div className="bg-[#141414] border border-white/10 rounded-3xl p-7 max-w-sm w-full"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-orange/15 flex items-center justify-center">
                <Lock size={22} className="text-orange" />
              </div>
              <button onClick={() => setGate(null)}>
                <X size={20} className="text-white/40 hover:text-white" />
              </button>
            </div>

            <h3 className="font-black text-xl text-white mb-2">
              Anmeldung erforderlich
            </h3>
            <p className="text-sm text-white/50 leading-relaxed mb-5">
              Um diesen Auftrag anzunehmen, brauchen Sie ein freigeschaltetes Shopper-Konto.
            </p>

            {/* Mission recap */}
            <div className="bg-white/[0.04] rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm text-white">{gate.store_name}</span>
                <span className="font-black text-green-400">
                  {Number(gate.net_earning).toFixed(2)} €
                </span>
              </div>
              <div className="text-xs text-white/40">
                {gate.city} · {gate.item_count} Artikel
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link href="/registrieren"
                className="bg-orange text-black font-black rounded-xl py-3.5 text-sm text-center hover:bg-orange-dark hover:text-white transition-colors flex items-center justify-center gap-2">
                Shopper werden <ArrowRight size={15} />
              </Link>
              <Link href="/anmelden?next=/shopper-portal/auftraege"
                className="border border-white/15 text-white font-bold rounded-xl py-3.5 text-sm text-center hover:border-orange hover:text-orange transition-all">
                Ich habe bereits ein Konto
              </Link>
            </div>

            <p className="text-[11px] text-white/30 text-center mt-4 leading-relaxed">
              Registrierung ist kostenlos. Nach Prüfung Ihrer Dokumente
              können Sie sofort loslegen.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
