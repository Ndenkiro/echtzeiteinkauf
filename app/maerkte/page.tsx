'use client'
// app/maerkte/page.tsx — Google Maps: all supermarkets in Germany via Places API
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Search, ArrowRight, Clock, Loader2, Crosshair } from 'lucide-react'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════
// ⬇️⬇️⬇️ DEINE GOOGLE MAPS API KEY HIER EINFÜGEN ⬇️⬇️⬇️
const GOOGLE_MAPS_API_KEY='AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'
// ⬆️⬆️⬆️ DEINE GOOGLE MAPS API KEY HIER EINFÜGEN ⬆️⬆️⬆️
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const PARTNER_CHAINS: Record<string, { color: string; slug: string }> = {
  'lidl':       { color: '#0050AA', slug: 'lidl-nuernberg' },
  'aldi':       { color: '#00457C', slug: 'aldi-sued-nuernberg' },
  'rewe':       { color: '#CC071E', slug: 'rewe-nuernberg' },
  'edeka':      { color: '#FFD500', slug: 'edeka-nuernberg' },
  'penny':      { color: '#CD1414', slug: 'penny-nuernberg' },
  'kaufland':   { color: '#E10915', slug: 'kaufland-nuernberg' },
  'netto':      { color: '#FFE500', slug: 'netto-nuernberg' },
  'mediamarkt': { color: '#DF0000', slug: 'mediamarkt-nuernberg' },
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
  openNow?: boolean; partner: { color: string; slug: string } | null
}

export default function MaerktePage() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const shopperMarkersRef = useRef<any[]>([])
  const placesService = useRef<any>(null)

  const [ready, setReady] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [stores, setStores] = useState<FoundStore[]>([])
  const [selected, setSelected] = useState<FoundStore | null>(null)
  const [shoppers, setShoppers] = useState<any[]>([])

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    if ((window as any).google?.maps) { setReady(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=de&region=DE`
    script.async = true
    script.onload = () => setReady(true)
    script.onerror = () => toast.error('Google Maps konnte nicht geladen werden — API Key prüfen')
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
        mapInstance.current.panTo({ lat: store.lat, lng: store.lng })
      })
      markersRef.current.push(marker)
    })
  }

  const searchNearby = useCallback((center: { lat: number; lng: number }) => {
    if (!placesService.current) return
    const g = (window as any).google
    setSearching(true)
    placesService.current.nearbySearch(
      { location: center, radius: 3000, type: 'supermarket' },
      (results: any[], status: string) => {
        setSearching(false)
        if (status !== g.maps.places.PlacesServiceStatus.OK || !results) {
          toast.error('Keine Supermärkte gefunden')
          return
        }
        const found: FoundStore[] = results.map(r => ({
          placeId: r.place_id,
          name: r.name,
          address: r.vicinity || '',
          lat: r.geometry.location.lat(),
          lng: r.geometry.location.lng(),
          rating: r.rating,
          openNow: r.opening_hours?.isOpen?.() ?? r.opening_hours?.open_now,
          partner: matchPartner(r.name),
        }))
        found.sort((a, b) => (b.partner ? 1 : 0) - (a.partner ? 1 : 0))
        setStores(found)
        renderMarkers(found)
      }
    )
  }, [])

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
    searchNearby({ lat: 49.4521, lng: 11.0767 })
  }, [ready, searchNearby])

  const searchAddress = () => {
    if (!query.trim()) return
    const g = (window as any).google
    setSearching(true)
    new g.maps.Geocoder().geocode(
      { address: query + ', Deutschland', region: 'DE' },
      (results: any[], status: string) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          const center = { lat: loc.lat(), lng: loc.lng() }
          mapInstance.current.setCenter(center)
          mapInstance.current.setZoom(13)
          setSelected(null)
          searchNearby(center)
        } else {
          setSearching(false)
          toast.error('Adresse nicht gefunden')
        }
      }
    )
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Standort nicht verfügbar'); return }
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapInstance.current.setCenter(center)
        mapInstance.current.setZoom(14)
        setSelected(null)
        searchNearby(center)
      },
      () => { setSearching(false); toast.error('Standortzugriff verweigert') }
    )
  }

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

  const partnerCount = stores.filter(s => s.partner).length

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-6 py-5">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-xl font-black text-gray-900 mb-1">Supermärkte in ganz Deutschland</h1>
            <p className="text-sm text-gray-500 mb-4">
              {stores.length} Märkte gefunden · <span className="text-red font-bold">{partnerCount} Partner</span> · <span className="text-green-600 font-bold">{shoppers.length} Shopper online</span>
            </p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-red transition-colors bg-white">
                <Search size={17} className="text-gray-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchAddress()}
                  placeholder="Stadt oder Adresse — z.B. Berlin, München, Hamburg..."
                  className="flex-1 outline-none text-sm bg-transparent"
                />
              </div>
              <button onClick={searchAddress} disabled={searching} className="btn-red px-5 text-sm">
                {searching ? <Loader2 size={16} className="animate-spin" /> : 'Suchen'}
              </button>
              <button onClick={useMyLocation} title="Meinen Standort verwenden" className="w-12 border-2 border-gray-100 rounded-2xl flex items-center justify-center hover:border-red hover:text-red transition-all">
                <Crosshair size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6 grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="relative">
            <div ref={mapRef} className="w-full h-[560px] rounded-3xl overflow-hidden border border-gray-200 shadow-sm" />
            {!ready && (
              <div className="absolute inset-0 bg-gray-100 rounded-3xl flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg px-4 py-3 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-red border-2 border-white shadow" /> Partner — hier bestellen</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white shadow" /> Bald verfügbar</div>
              <div className="flex items-center gap-2"><span className="text-sm">🚴</span> Shopper online</div>
            </div>
          </div>

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
                <div className="flex gap-2 mb-4 flex-wrap">
                  {selected.openNow !== undefined && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${selected.openNow ? 'bg-green-50 text-green-700' : 'bg-red/10 text-red'}`}>
                      {selected.openNow ? '🟢 Geöffnet' : '🔴 Geschlossen'}
                    </span>
                  )}
                  {selected.rating && (
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">⭐ {selected.rating}</span>
                  )}
                </div>
                {selected.partner ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-5">
                      <Clock size={13} /> Lieferung in ca. 2 Stunden
                    </div>
                    <button onClick={() => router.push(`/markt/${selected.partner!.slug}`)} className="btn-red w-full py-3.5">
                      Jetzt einkaufen <ArrowRight size={16} />
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
                    mapInstance.current?.panTo({ lat: store.lat, lng: store.lng })
                    mapInstance.current?.setZoom(15)
                  }}
                  className={`bg-white rounded-2xl border p-4 flex items-center gap-3 transition-all text-left ${
                    store.partner ? 'border-gray-100 hover:border-red' : 'border-gray-50 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-[10px] flex-shrink-0"
                    style={{ background: store.partner?.color || '#9CA3AF' }}
                  >{store.name.slice(0,3).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-gray-900 truncate">{store.name}</div>
                    <div className="text-xs text-gray-400 truncate">{store.address}</div>
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
