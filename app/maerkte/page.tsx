'use client'
// app/maerkte/page.tsx — only chains we actually serve
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import {
  Search, ArrowRight, Clock, Loader2, Crosshair, MapPin,
  Navigation, X, Store, Package, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getRecentAddresses, saveRecentAddress, removeRecentAddress,
  type RecentAddress,
} from '@/lib/recent-addresses'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

type LiveChain = {
  id: string
  label: string
  color: string
  category: string
  match_words: string[]
}

type FoundStore = {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  openNow?: boolean
  chain: LiveChain
  distance?: number
}

function matchChain(name: string, chains: LiveChain[]): LiveChain | null {
  const n = name.toLowerCase()
  for (const c of chains) {
    if (c.match_words.some(w => n.includes(w.toLowerCase()))) return c
  }
  return null
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function MaerkteContent() {
  const router = useRouter()
  const params = useSearchParams()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const placesService = useRef<any>(null)
  const lastCenter = useRef<{ lat: number; lng: number } | null>(null)

  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
  const [stores, setStores] = useState<FoundStore[]>([])
  const [selected, setSelected] = useState<FoundStore | null>(null)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [liveChains, setLiveChains] = useState<LiveChain[]>([])
  const [recents, setRecents] = useState<RecentAddress[]>([])
  const [isHistory, setIsHistory] = useState(false)
  const [showRecents, setShowRecents] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  // Which chains are live
  useEffect(() => {
    supabase.rpc('get_live_chains').then(({ data }) => {
      setLiveChains(data || [])
    })
  }, [])

  useEffect(() => {
    getRecentAddresses(4).then(r => { setRecents(r.addresses); setIsHistory(r.isHistory) })
  }, [])

  // Google Maps
  useEffect(() => {
    if ((window as any).google?.maps?.places) { setReady(true); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=de`
    s.async = true
    s.onload = () => setReady(true)
    document.head.appendChild(s)
  }, [])

  const renderMarkers = useCallback((list: FoundStore[]) => {
    const g = (window as any).google
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    list.forEach(s => {
      const marker = new g.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map: mapInstance.current,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: s.chain.color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        title: s.name,
      })
      marker.addListener('click', () => {
        setSelected(s)
        mapInstance.current.panTo({ lat: s.lat, lng: s.lng })
      })
      markersRef.current.push(marker)
    })
  }, [])

  const searchNearby = useCallback((center: { lat: number; lng: number }) => {
    if (!placesService.current || liveChains.length === 0) return
    const g = (window as any).google
    lastCenter.current = center
    setSearching(true)

    // Search each live chain by name — far more precise than a generic type
    let pending = liveChains.length
    const all: Record<string, FoundStore> = {}

    liveChains.forEach(chain => {
      placesService.current.textSearch(
        { location: center, radius: 15000, query: `${chain.label} Supermarkt` },
        (results: any[], status: string) => {
          if (status === g.maps.places.PlacesServiceStatus.OK && results) {
            results.forEach(r => {
              const matched = matchChain(r.name, liveChains)
              if (!matched || all[r.place_id]) return
              const lat = r.geometry.location.lat()
              const lng = r.geometry.location.lng()
              all[r.place_id] = {
                placeId: r.place_id,
                name: r.name,
                address: r.formatted_address || r.vicinity || '',
                lat, lng,
                rating: r.rating,
                openNow: r.opening_hours?.isOpen?.() ?? r.opening_hours?.open_now,
                chain: matched,
                distance: distanceKm(center.lat, center.lng, lat, lng),
              }
            })
          }
          pending -= 1
          if (pending === 0) {
            setSearching(false)
            const found = Object.values(all)
              .filter(s => (s.distance ?? 99) <= 25)
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
            setStores(found)
            renderMarkers(found)
            if (found.length === 0) {
              toast.error('Keine Partner-Märkte in dieser Gegend')
            }
          }
        }
      )
    })
  }, [liveChains, renderMarkers])

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current || liveChains.length === 0) return
    const g = (window as any).google

    const qLat = params.get('lat')
    const qLng = params.get('lng')
    const center = qLat && qLng
      ? { lat: Number(qLat), lng: Number(qLng) }
      : { lat: 49.4521, lng: 11.0767 }

    const map = new g.maps.Map(mapRef.current, {
      center, zoom: 12, disableDefaultUI: true, zoomControl: true,
      styles: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }],
    })
    mapInstance.current = map
    placesService.current = new g.maps.places.PlacesService(map)

    const q = params.get('q')
    if (q) setQuery(q)
    searchNearby(center)
  }, [ready, liveChains, params, searchNearby])

  const searchAddress = (override?: string) => {
    const q = (override ?? query).trim()
    if (!q) return
    const g = (window as any).google
    setSearching(true)
    setShowRecents(false)

    new g.maps.Geocoder().geocode(
      { address: q + ', Deutschland', region: 'DE' },
      async (results: any[], status: string) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          const center = { lat: loc.lat(), lng: loc.lng() }
          const pretty = results[0].formatted_address.replace(/,\s*(Deutschland|Germany)\s*$/i, '')
          setQuery(pretty)
          mapInstance.current.setCenter(center)
          mapInstance.current.setZoom(12)
          setSelected(null)
          searchNearby(center)
          await saveRecentAddress(pretty, center)
          getRecentAddresses(4).then(r => { setRecents(r.addresses); setIsHistory(r.isHistory) })
        } else {
          setSearching(false)
          toast.error('Adresse nicht gefunden')
        }
      }
    )
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Standort nicht verfügbar'); return }
    setLocating(true)
    setShowRecents(false)

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapInstance.current?.setCenter(center)
        mapInstance.current?.setZoom(13)
        setSelected(null)

        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${center.lat},${center.lng}&language=de&key=${GOOGLE_MAPS_API_KEY}`
          )
          const data = await res.json()
          const r = data.results?.[0]
          if (r) {
            const get = (t: string) =>
              r.address_components?.find((x: any) => x.types.includes(t))?.long_name || ''
            const street = [get('route'), get('street_number')].filter(Boolean).join(' ')
            const zip = get('postal_code')
            const city = get('locality') || get('administrative_area_level_1')
            const pretty = street && city
              ? `${street}, ${zip} ${city}`.replace(/\s+/g, ' ').trim()
              : r.formatted_address.replace(/,\s*(Deutschland|Germany)\s*$/i, '')
            setQuery(pretty)
            await saveRecentAddress(pretty, center)
            getRecentAddresses(4).then(x => { setRecents(x.addresses); setIsHistory(x.isHistory) })
          }
        } catch {}

        searchNearby(center)
        setLocating(false)
      },
      () => { setLocating(false); toast.error('Standortzugriff verweigert') },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const openStore = async (store: FoundStore) => {
    setResolving(true)
    try {
      const res = await fetch('/api/stores/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: store.placeId,
          name: store.name,
          address: store.address,
          lat: store.lat,
          lng: store.lng,
          category: store.chain.category,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Fehler')
      router.push(`/markt/${data.slug}`)
    } catch {
      toast.error('Markt konnte nicht geöffnet werden')
      setResolving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 mb-4 w-fit">
            <Image src="/logo.png" alt="" width={30} height={30} className="rounded-full" />
            <span className="font-black text-gray-900">Echtzeiteinkauf</span>
          </Link>

          <h1 className="text-xl font-black text-gray-900 mb-1">
            Partner-Märkte in Ihrer Nähe
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            {stores.length > 0
              ? `${stores.length} Märkte gefunden`
              : 'Geben Sie Ihre Adresse ein'}
            {liveChains.length > 0 && (
              <> · {liveChains.map(c => c.label).join(', ')}</>
            )}
          </p>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-red transition-colors bg-white">
                <Search size={17} className="text-gray-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setShowRecents(true)}
                  onBlur={() => setTimeout(() => setShowRecents(false), 180)}
                  onKeyDown={e => e.key === 'Enter' && searchAddress()}
                  placeholder="Straße, PLZ oder Stadt…"
                  className="flex-1 outline-none text-sm bg-transparent"
                />
                {query && (
                  <button onMouseDown={e => { e.preventDefault(); setQuery('') }}>
                    <X size={15} className="text-gray-300 hover:text-gray-500" />
                  </button>
                )}
              </div>

              {showRecents && recents.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-30">
                  <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                    {isHistory && <Clock size={11} className="text-gray-300" />}
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-wide">
                      {isHistory ? 'Zuletzt verwendet' : 'Beispieladressen'}
                    </span>
                  </div>
                  {recents.map(r => (
                    <div key={r.fullText}
                      onMouseDown={e => {
                        e.preventDefault()
                        setQuery(r.fullText)
                        searchAddress(r.fullText)
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                        {isHistory ? <Clock size={13} className="text-red" />
                                   : <MapPin size={13} className="text-red" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900 truncate">{r.label}</div>
                        {r.subLabel && (
                          <div className="text-xs text-gray-400 truncate">{r.subLabel}</div>
                        )}
                      </div>
                      {isHistory && (
                        <button
                          onMouseDown={async e => {
                            e.preventDefault(); e.stopPropagation()
                            await removeRecentAddress(r.fullText)
                            const x = await getRecentAddresses(4)
                            setRecents(x.addresses); setIsHistory(x.isHistory)
                          }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-200 hover:text-red hover:bg-red/10 transition-all flex-shrink-0">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => searchAddress()} disabled={searching}
              className="btn-red px-5 text-sm flex-shrink-0">
              {searching ? <Loader2 size={16} className="animate-spin" /> : 'Suchen'}
            </button>
            <button onClick={useMyLocation} disabled={locating}
              title="Mein Standort"
              className="px-4 border-2 border-gray-100 rounded-2xl text-gray-500 hover:border-red hover:text-red transition-all flex-shrink-0">
              {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 mb-5 relative">
          <div ref={mapRef} className="w-full h-72 bg-gray-100" />
          {searching && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <div className="bg-white rounded-xl shadow px-4 py-2.5 flex items-center gap-2">
                <Loader2 size={15} className="animate-spin text-red" />
                <span className="text-xs font-bold text-gray-600">Märkte werden gesucht…</span>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {liveChains.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
            {liveChains.map(c => (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-white shadow"
                  style={{ background: c.color }} />
                {c.label}
              </div>
            ))}
          </div>
        )}

        {/* Selected store */}
        {selected && (
          <div className="bg-white rounded-2xl border-2 p-5 mb-5"
            style={{ borderColor: selected.chain.color }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${selected.chain.color}20` }}>
                <Store size={22} style={{ color: selected.chain.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-gray-900">{selected.name}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {selected.address}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-black px-2 py-1 rounded-full text-white"
                    style={{ background: selected.chain.color }}>
                    {selected.chain.label}
                  </span>
                  {selected.distance != null && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      {selected.distance.toFixed(1)} km
                    </span>
                  )}
                  {selected.openNow !== undefined && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      selected.openNow ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {selected.openNow ? 'Geöffnet' : 'Geschlossen'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button onClick={() => openStore(selected)} disabled={resolving}
              className="btn-red w-full py-3.5">
              {resolving
                ? <><Loader2 size={16} className="animate-spin" /> Markt wird geöffnet…</>
                : <>Jetzt einkaufen <ArrowRight size={16} /></>}
            </button>
          </div>
        )}

        {/* List */}
        {stores.length === 0 && !searching ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Store size={34} className="text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-900 mb-1">Keine Partner-Märkte gefunden</p>
            <p className="text-sm text-gray-400 mb-5">
              Wir sind derzeit bei {liveChains.map(c => c.label).join(' und ')} verfügbar.
              Geben Sie eine andere Adresse ein.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {stores.map(s => (
              <button key={s.placeId}
                onClick={() => { setSelected(s); mapInstance.current?.panTo({ lat: s.lat, lng: s.lng }) }}
                className={`flex items-center gap-3 bg-white rounded-2xl border-2 p-4 text-left transition-all ${
                  selected?.placeId === s.placeId ? '' : 'border-gray-100 hover:border-gray-200'
                }`}
                style={selected?.placeId === s.placeId
                  ? { borderColor: s.chain.color } : undefined}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.chain.color}20` }}>
                  <Store size={19} style={{ color: s.chain.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{s.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{s.address}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  {s.distance != null && (
                    <div className="text-xs font-black text-gray-900">
                      {s.distance.toFixed(1)} km
                    </div>
                  )}
                  {s.openNow !== undefined && (
                    <div className={`text-[10px] font-bold ${
                      s.openNow ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {s.openNow ? 'Offen' : 'Zu'}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Coming soon */}
        <div className="bg-gray-100 rounded-2xl p-5 mt-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-gray-900 mb-1">
              Weitere Märkte folgen
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Wir bauen unser Partnernetz Schritt für Schritt aus. Sie betreiben ein
              Geschäft?{' '}
              <Link href="/haendler" className="text-red font-bold hover:underline">
                Jetzt Partner werden
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MaerktePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MaerkteContent />
    </Suspense>
  )
}
