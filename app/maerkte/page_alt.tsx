'use client'
// app/maerkte/page.tsx — Google Maps with opening hours, distance, geolocation
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Search, ArrowRight, Clock, Loader2, Crosshair, MapPin, Navigation, X } from 'lucide-react'
import { toast } from 'sonner'
import { Suspense } from 'react'
import {
  getRecentAddresses, saveRecentAddress, removeRecentAddress,
  type RecentAddress,
} from '@/lib/recent-addresses'
import { CATEGORIES, detectCategory, getCategory, type CategoryId } from '@/lib/categories'

const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const PARTNER_CHAINS: Record<string, { color: string; slug: string }> = {
  'lidl':       { color: '#0050AA', slug: 'lidl' },
  'aldi':       { color: '#00457C', slug: 'aldi-sued' },
  'rewe':       { color: '#CC071E', slug: 'rewe' },
  'edeka':      { color: '#FFD500', slug: 'edeka' },
  'penny':      { color: '#CD1414', slug: 'penny' },
  'kaufland':   { color: '#E10915', slug: 'kaufland' },
  'netto':      { color: '#FFE500', slug: 'netto' },
  'mediamarkt': { color: '#DF0000', slug: 'mediamarkt' },
}

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function matchPartner(name: string) {
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(PARTNER_CHAINS)) {
    if (lower.includes(key)) return val
  }
  return null
}

type FoundStore = {
  placeId: string; name: string; address: string
  lat: number; lng: number; rating?: number
  openNow?: boolean; weekdayText?: string[]
  partner: { color: string; slug: string } | null
  distance?: number
  category: CategoryId
}

function MaerkteContent() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const shopperMarkersRef = useRef<any[]>([])
  const placesService = useRef<any>(null)
  const userCenter = useRef<{ lat: number; lng: number } | null>(null)

  const [ready, setReady] = useState(false)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [stores, setStores] = useState<FoundStore[]>([])
  const [selected, setSelected] = useState<FoundStore | null>(null)
  const [shoppers, setShoppers] = useState<any[]>([])
  const [expandedHours, setExpandedHours] = useState(false)
  const [recents, setRecents] = useState<RecentAddress[]>([])
  const [isHistory, setIsHistory] = useState(false)
  const [showRecents, setShowRecents] = useState(false)
  const [activeCat, setActiveCat] = useState<CategoryId>('food')
  const [resolving, setResolving] = useState(false)
  const lastCenter = useRef<{ lat: number; lng: number } | null>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    if ((window as any).google?.maps) { setReady(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=de&region=DE`
    script.async = true
    script.onload = () => setReady(true)
    script.onerror = () => toast.error('Google Maps konnte nicht geladen werden')
    document.head.appendChild(script)
  }, [])

  const renderMarkers = (found: FoundStore[]) => {
    const g = (window as any).google
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    found.forEach(store => {
      const isPartner = !!store.partner
      const marker = new g.maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        map: mapInstance.current,
        title: store.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: isPartner ? 14 : 9,
          fillColor: store.partner?.color || '#9CA3AF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: isPartner ? 100 : 10,
      })
      marker.addListener('click', () => {
        setSelected(store)
        setExpandedHours(false)
        mapInstance.current.panTo({ lat: store.lat, lng: store.lng })
      })
      markersRef.current.push(marker)
    })
  }

  // Fetch opening hours for selected store
  const fetchHours = (placeId: string) => {
    if (!placesService.current) return
    placesService.current.getDetails(
      { placeId, fields: ['opening_hours'] },
      (result: any, status: string) => {
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
          setSelected(prev => prev ? {
            ...prev,
            weekdayText: result.opening_hours?.weekday_text || [],
            openNow: result.opening_hours?.isOpen?.() ?? prev.openNow,
          } : prev)
        }
      }
    )
  }

  const searchNearby = useCallback((
    center: { lat: number; lng: number },
    catId?: CategoryId
  ) => {
    if (!placesService.current) return
    const g = (window as any).google
    const cat = getCategory(catId ?? activeCat)
    userCenter.current = center
    lastCenter.current = center
    setSearching(true)

    // Query every Google type of this category, then merge
    const types = cat.googleTypes
    let pending = types.length
    const all: Record<string, FoundStore> = {}

    types.forEach(type => {
      placesService.current.nearbySearch(
        { location: center, radius: 4000, type },
        (results: any[], status: string) => {
          if (status === g.maps.places.PlacesServiceStatus.OK && results) {
            results.forEach(r => {
              if (all[r.place_id]) return
              all[r.place_id] = {
                placeId: r.place_id,
                name: r.name,
                address: r.vicinity || '',
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
                rating: r.rating,
                openNow: r.opening_hours?.isOpen?.() ?? r.opening_hours?.open_now,
                partner: matchPartner(r.name),
                distance: distanceKm(center.lat, center.lng, r.geometry.location.lat(), r.geometry.location.lng()),
                category: detectCategory(r.name),
              }
            })
          }
          pending -= 1
          if (pending === 0) {
            setSearching(false)
            const found = Object.values(all).sort((a, b) => {
              if (!!a.partner !== !!b.partner) return b.partner ? 1 : -1
              return (a.distance || 0) - (b.distance || 0)
            })
            setStores(found)
            renderMarkers(found)
            if (found.length === 0) toast.error(`Keine ${cat.label}-Märkte in der Nähe`)
          }
        }
      )
    })
  }, [activeCat])

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return
    const g = (window as any).google
    const map = new g.maps.Map(mapRef.current, {
      center: { lat: 49.4521, lng: 11.0767 },
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapInstance.current = map
    placesService.current = new g.maps.places.PlacesService(map)

    const initialLat = searchParams.get('lat')
    const initialLng = searchParams.get('lng')
    const initialQ = searchParams.get('q')
    if (initialLat && initialLng) {
      const center = { lat: parseFloat(initialLat), lng: parseFloat(initialLng) }
      map.setCenter(center)
      map.setZoom(14)
      setQuery('Mein Standort')
      searchNearby(center)
    } else if (initialQ) {
      setQuery(initialQ)
      new g.maps.Geocoder().geocode(
        { address: initialQ + ', Deutschland', region: 'DE' },
        (results: any[], status: string) => {
          if (status === 'OK' && results?.[0]) {
            const loc = results[0].geometry.location
            const center = { lat: loc.lat(), lng: loc.lng() }
            map.setCenter(center)
            map.setZoom(14)
            searchNearby(center)
          } else {
            searchNearby({ lat: 49.4521, lng: 11.0767 })
          }
        }
      )
    } else {
      searchNearby({ lat: 49.4521, lng: 11.0767 })
    }
  }, [ready, searchNearby])

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
          mapInstance.current.setZoom(13)
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

  // Geolocation
  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Standort nicht verfügbar'); return }
    setLocating(true)
    setShowRecents(false)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapInstance.current?.setCenter(center)
        mapInstance.current?.setZoom(14)
        setSelected(null)

        // Reverse geocode so the field shows a real address
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
          } else {
            setQuery('Mein Standort')
          }
        } catch {
          setQuery('Mein Standort')
        }

        searchNearby(center)
        setLocating(false)
        // Add user location marker
        const g = (window as any).google
        new g.maps.Marker({
          position: center,
          map: mapInstance.current,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#E30B6D',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: 'Ihr Standort',
          zIndex: 500,
        })
      },
      () => { setLocating(false); toast.error('Standortzugriff verweigert') }
    )
  }

  // Recent addresses
  useEffect(() => {
    getRecentAddresses(4).then(({ addresses, isHistory }) => {
      setRecents(addresses)
      setIsHistory(isHistory)
    })
  }, [])

  useEffect(() => {
    const loadShoppers = async () => {
      const { data } = await supabase
        .from('shopper_locations')
        .select('shopper_id, lat, lng, is_online, shoppers(rating, total_deliveries)')
        .eq('is_online', true)
      setShoppers(data || [])
    }
    loadShoppers()
    const channel = supabase
      .channel('shopper-locs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopper_locations' }, loadShoppers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!ready || !mapInstance.current) return
    const g = (window as any).google
    shopperMarkersRef.current.forEach(m => m.setMap(null))
    shopperMarkersRef.current = []
    shoppers.forEach(s => {
      const marker = new g.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map: mapInstance.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="#F7A800" stroke="white" stroke-width="3"/>
              <text x="18" y="24" text-anchor="middle" font-size="16">🚴</text>
              <circle cx="29" cy="7" r="5" fill="#22C55E" stroke="white" stroke-width="2"/>
            </svg>`),
          scaledSize: new g.maps.Size(36, 36),
        },
        zIndex: 200,
      })
      const info = new g.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;font-size:13px"><b>Shopper verfügbar</b><br/>⭐ ${s.shoppers?.rating || '5.0'} · ${s.shoppers?.total_deliveries || 0} Lieferungen</div>`,
      })
      marker.addListener('click', () => info.open(mapInstance.current, marker))
      shopperMarkersRef.current.push(marker)
    })
  }, [shoppers, ready])

  // Fetch hours when store is selected
  useEffect(() => {
    if (selected && !selected.weekdayText) {
      fetchHours(selected.placeId)
    }
  }, [selected?.placeId])

  // Turn a Places result into a real store, then open its catalogue
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
          category: store.category,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Fehler')

      if (data.created && data.products_copied === 0) {
        toast('Dieser Markt ist neu — der Katalog wird noch aufgebaut.', { icon: 'ℹ️' })
      }
      router.push(`/markt/${data.slug}`)
    } catch (e: any) {
      toast.error('Markt konnte nicht geöffnet werden')
      setResolving(false)
    }
  }

  const switchCategory = (catId: CategoryId) => {
    setActiveCat(catId)
    setSelected(null)
    const c = lastCenter.current ?? { lat: 49.4521, lng: 11.0767 }
    searchNearby(c, catId)
  }

  const partnerCount = stores.filter(s => s.partner).length
  const activeCategory = getCategory(activeCat)
  const TODAY = new Date().getDay() // 0=Sun, 1=Mon...
  const DE_DAY = TODAY === 0 ? 6 : TODAY - 1 // German weekday_text starts Mon=0

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-gray-50">
        {/* Search header */}
        <div className="bg-white border-b border-gray-100 px-6 py-5">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-xl font-black text-gray-900 mb-1">
              {activeCategory.icon} {activeCategory.label} in Ihrer Nähe
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              {stores.length} Märkte gefunden · <span className="text-red font-bold">{partnerCount} Partner</span> · <span className="text-green-600 font-bold">{shoppers.length} Shopper online</span>
            </p>

            {/* Category tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
              {CATEGORIES.filter(c => c.id !== 'other').map(c => {
                const active = activeCat === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => switchCategory(c.id)}
                    disabled={searching}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2 flex-shrink-0 ${
                      active
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-gray-100 text-gray-500 hover:border-gray-200 bg-white'
                    }`}
                    style={active ? { background: c.color } : undefined}
                  >
                    <span className="text-base">{c.icon}</span> {c.label}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              {/* Geolocation button */}
              <button
                onClick={useMyLocation}
                disabled={locating || !ready}
                title="Meinen Standort verwenden"
                className="flex items-center gap-2 px-4 py-3 border-2 border-red/30 bg-red/5 text-red rounded-2xl text-sm font-bold hover:bg-red hover:text-white transition-all disabled:opacity-40 flex-shrink-0"
              >
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                <span className="hidden sm:inline">Mein Standort</span>
              </button>

              {/* Address search */}
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-red transition-colors bg-white">
                  <Search size={17} className="text-gray-400 flex-shrink-0" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setShowRecents(true)}
                    onBlur={() => setTimeout(() => setShowRecents(false), 180)}
                    onKeyDown={e => e.key === 'Enter' && searchAddress()}
                    placeholder="Stadt oder Adresse — z.B. Berlin, München, Hamburg..."
                    className="flex-1 outline-none text-sm bg-transparent"
                  />
                  {query && (
                    <button onMouseDown={e => { e.preventDefault(); setQuery('') }}>
                      <X size={15} className="text-gray-300 hover:text-gray-500" />
                    </button>
                  )}
                </div>

                {/* Recent addresses dropdown */}
                {showRecents && recents.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-30">
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                      {isHistory && <Clock size={11} className="text-gray-300" />}
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-wide">
                        {isHistory ? 'Zuletzt verwendet' : 'Beispieladressen'}
                      </span>
                    </div>
                    {recents.map(r => (
                      <div
                        key={r.fullText}
                        onMouseDown={e => {
                          e.preventDefault()
                          setQuery(r.fullText)
                          searchAddress(r.fullText)
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                          {isHistory
                            ? <Clock size={13} className="text-red" />
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
                              e.preventDefault()
                              e.stopPropagation()
                              await removeRecentAddress(r.fullText)
                              const x = await getRecentAddresses(4)
                              setRecents(x.addresses)
                              setIsHistory(x.isHistory)
                            }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-200 hover:text-red hover:bg-red/10 transition-all flex-shrink-0"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => searchAddress()} disabled={searching} className="btn-red px-5 text-sm flex-shrink-0">
                {searching ? <Loader2 size={16} className="animate-spin" /> : 'Suchen'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6 grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Map */}
          <div className="relative">
            <div ref={mapRef} className="w-full h-[560px] rounded-3xl overflow-hidden border border-gray-200 shadow-sm" />
            {!ready && (
              <div className="absolute inset-0 bg-gray-100 rounded-3xl flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg px-4 py-3 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white shadow" style={{ background: activeCategory.color }} /> Partner — hier bestellen</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white shadow" /> Bald verfügbar</div>
              <div className="flex items-center gap-2"><span className="text-sm">🚴</span> Shopper online</div>
            </div>
          </div>

          {/* Store list / detail */}
          <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-1">
            {selected ? (
              <div className={`bg-white rounded-2xl border-2 p-5 ${selected.partner ? 'border-red' : 'border-gray-200'}`}>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 font-bold mb-3 hover:text-gray-600">← Alle Märkte</button>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xs flex-shrink-0"
                    style={{ background: selected.partner?.color || '#9CA3AF' }}
                  >{selected.name.slice(0,3).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">{selected.name}</div>
                    <div className="text-xs text-gray-400 truncate">{selected.address}</div>
                  </div>
                </div>

                {/* Status + distance + rating */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ background: getCategory(selected.category).color }}
                  >
                    {getCategory(selected.category).icon} {getCategory(selected.category).label}
                  </span>
                  {selected.openNow !== undefined && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${selected.openNow ? 'bg-green-50 text-green-700' : 'bg-red/10 text-red'}`}>
                      {selected.openNow ? '🟢 Geöffnet' : '🔴 Geschlossen'}
                    </span>
                  )}
                  {selected.distance !== undefined && (
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                      📍 {selected.distance < 1 ? `${Math.round(selected.distance * 1000)} m` : `${selected.distance.toFixed(1)} km`}
                    </span>
                  )}
                  {selected.rating && (
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">⭐ {selected.rating}</span>
                  )}
                </div>

                {/* Opening hours */}
                {selected.weekdayText && selected.weekdayText.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setExpandedHours(h => !h)}
                      className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors mb-2"
                    >
                      <Clock size={13} /> Öffnungszeiten {expandedHours ? '▲' : '▼'}
                    </button>
                    {expandedHours ? (
                      <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                        {selected.weekdayText.map((line, i) => (
                          <div key={i} className={`text-xs flex justify-between gap-2 ${i === DE_DAY ? 'font-black text-gray-900' : 'text-gray-500'}`}>
                            <span>{line.split(': ')[0]}</span>
                            <span>{line.split(': ')[1]}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                        {selected.weekdayText[DE_DAY] || selected.weekdayText[0]}
                      </div>
                    )}
                  </div>
                )}

                {selected.partner ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                      <Clock size={13} /> Lieferung in ca. 2 Stunden
                    </div>
                    <button
                      onClick={() => openStore(selected)}
                      disabled={resolving}
                      className="btn-red w-full py-3.5"
                    >
                      {resolving
                        ? <><Loader2 size={16} className="animate-spin" /> Markt wird geöffnet…</>
                        : <>Jetzt einkaufen <ArrowRight size={16} /></>}
                    </button>
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-sm font-bold text-gray-500 mb-1">Bald verfügbar</div>
                    <div className="text-xs text-gray-400">Dieser Markt ist noch kein Partner von Echtzeiteinkauf</div>
                  </div>
                )}
              </div>
            ) : (
              stores.map(store => (
                <button
                  key={store.placeId}
                  onClick={() => {
                    setSelected(store)
                    setExpandedHours(false)
                    mapInstance.current?.panTo({ lat: store.lat, lng: store.lng })
                    mapInstance.current?.setZoom(15)
                  }}
                  className={`bg-white rounded-2xl border p-4 flex items-center gap-3 transition-all text-left ${
                    store.partner ? 'border-gray-100 hover:border-red' : 'border-gray-50 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-[10px] flex-shrink-0"
                    style={{ background: store.partner?.color || '#9CA3AF' }}
                  >{store.name.slice(0,3).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-gray-900 truncate">{store.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {store.openNow !== undefined && (
                        <span className={`text-[10px] font-bold ${store.openNow ? 'text-green-600' : 'text-red'}`}>
                          {store.openNow ? '● Geöffnet' : '● Geschlossen'}
                        </span>
                      )}
                      {store.distance !== undefined && (
                        <span className="text-[10px] text-gray-400">
                          {store.distance < 1 ? `${Math.round(store.distance * 1000)} m` : `${store.distance.toFixed(1)} km`}
                        </span>
                      )}
                    </div>
                  </div>
                  {store.partner ? (
                    <span className="text-[10px] font-black text-red bg-red/10 px-2 py-1 rounded-full flex-shrink-0">PARTNER</span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full flex-shrink-0">BALD</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
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
